#!/usr/bin/env node
// Fails CI when the RLS policies for member_applications or user_roles
// drift from the expected deny-by-default rules. Parses migration SQL
// (no DB connection required) and asserts the final expected state.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const TABLES = ["member_applications", "user_roles"];

/**
 * Expected invariants per table (after all migrations applied):
 *  - RLS enabled
 *  - Exactly the listed write policies exist, each denying all client writes
 *    (predicate `false`) for BOTH authenticated and anon roles
 *  - At least one SELECT policy scoped by has_role(..., 'admin')
 *  - No GRANT of INSERT/UPDATE/DELETE to anon
 */
const EXPECTED = {
  member_applications: {
    writePolicies: [
      "no client inserts on applications",
      "no client updates on applications",
      "no client deletes on applications",
    ],
    adminSelectPolicy: /has_role\(\s*auth\.uid\(\)\s*,\s*'admin'(?:::app_role)?\s*\)/i,
  },
  user_roles: {
    writePolicies: [
      "no client inserts on roles",
      "no client updates on roles",
      "no client deletes on roles",
    ],
    adminSelectPolicy: /has_role\(\s*auth\.uid\(\)\s*,\s*'admin'(?:::app_role)?\s*\)/i,
  },
};

function loadSql() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  return files.map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8")).join("\n\n");
}

/** Return the last matching CREATE POLICY body for `policyName` on `table`, or null. */
function findLatestPolicy(sql, table, policyName) {
  // Match: CREATE POLICY "name" ON public.table ... ; up to next semicolon
  const re = new RegExp(
    `CREATE\\s+POLICY\\s+"${policyName.replace(/[.*+?^${}()|[\\\]\\\\]/g, "\\\\$&")}"\\s+ON\\s+public\\.${table}[\\s\\S]*?;`,
    "gi",
  );
  const matches = sql.match(re);
  return matches ? matches[matches.length - 1] : null;
}

/** All CREATE POLICY statements on a table, in order. */
function allPoliciesOn(sql, table) {
  const re = new RegExp(
    `CREATE\\s+POLICY\\s+"([^"]+)"\\s+ON\\s+public\\.${table}[\\s\\S]*?;`,
    "gi",
  );
  const out = [];
  let m;
  while ((m = re.exec(sql)) !== null) out.push({ name: m[1], body: m[0] });
  return out;
}

function assertRlsEnabled(sql, table, errors) {
  const re = new RegExp(
    `ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    "i",
  );
  if (!re.test(sql)) errors.push(`RLS is not enabled on public.${table}`);
}

function assertWritePolicy(sql, table, policyName, command, errors) {
  const body = findLatestPolicy(sql, table, policyName);
  if (!body) {
    errors.push(`Missing policy "${policyName}" on public.${table}`);
    return;
  }
  if (!new RegExp(`FOR\\s+${command}\\b`, "i").test(body)) {
    errors.push(`Policy "${policyName}" on ${table} must be FOR ${command}`);
  }
  if (!/TO\s+authenticated\s*,\s*anon\b|TO\s+anon\s*,\s*authenticated\b/i.test(body)) {
    errors.push(
      `Policy "${policyName}" on ${table} must target both authenticated and anon roles`,
    );
  }
  // Both USING and WITH CHECK (where applicable) must be exactly `false`.
  const needsUsing = command === "UPDATE" || command === "DELETE";
  const needsCheck = command === "INSERT" || command === "UPDATE";
  if (needsUsing && !/USING\s*\(\s*false\s*\)/i.test(body)) {
    errors.push(`Policy "${policyName}" on ${table} must have USING (false)`);
  }
  if (needsCheck && !/WITH\s+CHECK\s*\(\s*false\s*\)/i.test(body)) {
    errors.push(`Policy "${policyName}" on ${table} must have WITH CHECK (false)`);
  }
}

function assertNoUnexpectedWritePolicies(sql, table, expectedNames, errors) {
  const all = allPoliciesOn(sql, table);
  const writeRe = /FOR\s+(INSERT|UPDATE|DELETE|ALL)\b/i;
  const seen = new Set();
  for (const { name, body } of all) {
    if (!writeRe.test(body)) continue; // SELECT policies are checked separately
    seen.add(name);
    if (!expectedNames.includes(name)) {
      errors.push(
        `Unexpected write policy "${name}" on ${table} — not in the deny-by-default allowlist`,
      );
    }
    // FOR ALL is not allowed; it would permit writes if predicates evaluate true elsewhere
    if (/FOR\s+ALL\b/i.test(body)) {
      errors.push(`Policy "${name}" on ${table} uses FOR ALL; must be split into deny-only policies`);
    }
  }
}

function assertAdminSelectPolicy(sql, table, adminRe, errors) {
  const all = allPoliciesOn(sql, table);
  const adminSelects = all.filter(
    ({ body }) => /FOR\s+SELECT\b/i.test(body) && adminRe.test(body),
  );
  if (adminSelects.length === 0) {
    errors.push(`Expected an admin-scoped SELECT policy on ${table} using has_role(auth.uid(),'admin')`);
  }
}

function assertNoAnonWriteGrants(sql, table, errors) {
  // Match GRANT ... ON public.<table> TO ... anon ...
  const re = new RegExp(
    `GRANT\\s+[^;]*?(INSERT|UPDATE|DELETE)[^;]*?\\bON\\s+public\\.${table}\\b[^;]*?\\bTO\\s+[^;]*?\\banon\\b[^;]*?;`,
    "gi",
  );
  if (re.test(sql)) {
    errors.push(`anon role has an INSERT/UPDATE/DELETE grant on public.${table}`);
  }
}

function main() {
  const sql = loadSql();
  const errors = [];

  for (const table of TABLES) {
    const spec = EXPECTED[table];
    assertRlsEnabled(sql, table, errors);
    assertAdminSelectPolicy(sql, table, spec.adminSelectPolicy, errors);
    assertNoAnonWriteGrants(sql, table, errors);
    assertNoUnexpectedWritePolicies(sql, table, spec.writePolicies, errors);
    for (const name of spec.writePolicies) {
      const command = name.includes("insert")
        ? "INSERT"
        : name.includes("update")
          ? "UPDATE"
          : "DELETE";
      assertWritePolicy(sql, table, name, command, errors);
    }
  }

  if (errors.length > 0) {
    console.error("\n\u274c RLS policy check failed:\n");
    for (const e of errors) console.error("  \u2022 " + e);
    console.error(
      "\nExpected: member_applications and user_roles must have RLS enabled,\n" +
        "an admin-scoped SELECT policy, and explicit deny-all INSERT/UPDATE/DELETE\n" +
        "policies for both authenticated and anon (predicates `false`).\n",
    );
    process.exit(1);
  }

  console.log("\u2705 RLS deny-by-default policies verified for:", TABLES.join(", "));
}

main();