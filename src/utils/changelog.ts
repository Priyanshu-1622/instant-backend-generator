/**
 * generated.lock — tracks what the generator last produced.
 * Lets us detect re-runs so migrations stay idempotent.
 *
 * Format:
 * {
 *   version: 1,
 *   generatedAt: ISO string,
 *   models: { [ModelName]: { fields: string[], routes: string[], schemaHash: string } }
 * }
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface ModelEntry {
  fields: string[];
  routes: string[];
  schemaHash: string;
}

export interface Changelog {
  version: number;
  generatedAt: string;
  models: Record<string, ModelEntry>;
}

const LOCK_FILE = "generated.lock";

export function readChangelog(root: string): Changelog {
  const p = path.join(root, LOCK_FILE);
  if (!fs.existsSync(p)) {
    return { version: 1, generatedAt: "", models: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as Changelog;
  } catch {
    return { version: 1, generatedAt: "", models: {} };
  }
}

export function writeChangelog(root: string, log: Changelog): void {
  fs.writeFileSync(
    path.join(root, LOCK_FILE),
    JSON.stringify({ ...log, generatedAt: new Date().toISOString() }, null, 2),
    "utf-8"
  );
}

export function hashSchema(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 12);
}

/**
 * Returns true if this model+routes combination is identical to the last run.
 * Safe to skip regeneration if true — but we still always write schema.prisma
 * because Prisma Migrate is itself idempotent.
 */
export function isUnchanged(
  log: Changelog,
  modelName: string,
  fields: string[],
  routes: string[],
  schemaHash: string
): boolean {
  const prev = log.models[modelName];
  if (!prev) return false;
  return (
    prev.schemaHash === schemaHash &&
    JSON.stringify(prev.fields.sort()) === JSON.stringify([...fields].sort()) &&
    JSON.stringify(prev.routes.sort()) === JSON.stringify([...routes].sort())
  );
}
