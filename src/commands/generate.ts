import readline from "readline";
import fs from "fs";
import path from "path";

import { generateService } from "../generator/service.generator";
import { generateController } from "../generator/controller.generator";
import { generateRoute } from "../generator/route.generator";
import { generateApp } from "../generator/app.generator";
import { generateValidation } from "../generator/validation.generator";
import { writeFile } from "../utils/fileWriter";
import { readChangelog, writeChangelog, hashSchema, isUnchanged } from "../utils/changelog";

// ─── Types ────────────────────────────────────────────────────────────────────

export const ALL_ROUTES = ["create", "list", "get", "update", "delete"] as const;
export type RouteName = typeof ALL_ROUTES[number];

export interface ParsedField {
  name: string;
  type: string;
  isOptional: boolean;
  isRelation: boolean;
  relationModel?: string;
}

export interface ParsedModel {
  modelName: string;
  fields: ParsedField[];
  routes: RouteName[];   // opt-in: only these routes are generated
  version: number;       // explicit model version — written as comment in schema
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Schema parser ────────────────────────────────────────────────────────────
//
// Extended syntax:
//   ModelName@v2 field:type field?:type --routes=create,list,get
//
// Examples:
//   User name:string email:string
//   User@v2 name:string email:string --routes=create,list,get
//   Post title:string userId:int --routes=create,list
//   Comment text:string postId:int userId:int --routes=create,list,delete

function parseRoutes(token: string): RouteName[] {
  const match = token.match(/^--routes=(.+)$/);
  if (!match) return [...ALL_ROUTES];
  return match[1]
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter((r): r is RouteName => (ALL_ROUTES as readonly string[]).includes(r));
}

function parseVersion(modelToken: string): { name: string; version: number } {
  const match = modelToken.match(/^(.+?)@v(\d+)$/);
  if (match) return { name: match[1], version: parseInt(match[2], 10) };
  return { name: modelToken, version: 1 };
}

export function parseSchema(input: string): ParsedModel[] | null {
  const modelStrings = input
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  if (modelStrings.length === 0) {
    console.error("❌  No models found in input.\n");
    return null;
  }

  const models: ParsedModel[] = [];

  for (const modelStr of modelStrings) {
    const parts = modelStr.split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;

    // First token: ModelName or ModelName@v2
    const { name: rawName, version } = parseVersion(parts[0]);
    const modelName = capitalise(rawName);

    // Pull out --routes=... flag if present
    const routesFlagIdx = parts.findIndex((p) => p.startsWith("--routes="));
    const routes =
      routesFlagIdx !== -1 ? parseRoutes(parts[routesFlagIdx]) : [...ALL_ROUTES];

    // Everything else is a field
    const fieldParts = parts
      .slice(1)
      .filter((p) => !p.startsWith("--"));

    const fields: ParsedField[] = fieldParts
      .map((f) => {
        const [rawFieldName, type] = f.split(":");
        if (!rawFieldName || !type) {
          console.error(`❌  Invalid field "${f}" — expected name:type`);
          return null;
        }

        const isOptional = rawFieldName.endsWith("?");
        const name = rawFieldName.replace("?", "");

        const isRelation =
          name.endsWith("Id") &&
          name.length > 2 &&
          (type === "int" || type === "number");

        const relationModel = isRelation
          ? capitalise(name.slice(0, -2))
          : undefined;

        return { name, type, isOptional, isRelation, relationModel } as ParsedField;
      })
      .filter((f): f is ParsedField => f !== null);

    models.push({ modelName, fields, routes, version });
  }

  return models;
}

// ─── Prisma schema builder ────────────────────────────────────────────────────

const PRISMA_TYPE_MAP: Record<string, string> = {
  string:   "String",
  int:      "Int",
  number:   "Int",
  float:    "Float",
  boolean:  "Boolean",
  bool:     "Boolean",
  datetime: "DateTime",
};

export function buildPrismaSchema(models: ParsedModel[]): string {
  let schema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
`;

  const modelNames = new Set(models.map((m) => m.modelName));

  for (const m of models) {
    // Version comment — explicit model versioning so diffs are readable
    schema += `\n// @version ${m.version}\nmodel ${m.modelName} {\n`;
    schema += `  id        Int      @id @default(autoincrement())\n`;
    schema += `  createdAt DateTime @default(now())\n`;

    for (const f of m.fields) {
      const optional = f.isOptional ? "?" : "";
      if (f.isRelation && f.relationModel) {
        const rel = f.relationModel;
        schema += `  ${f.name.padEnd(12)}Int${optional}\n`;
        schema += `  ${rel.toLowerCase().padEnd(12)}${rel}${optional} @relation(fields: [${f.name}], references: [id])\n`;
      } else {
        const prismaType = PRISMA_TYPE_MAP[f.type.toLowerCase()] ?? "String";
        schema += `  ${f.name.padEnd(12)}${prismaType}${optional}\n`;
      }
    }

    schema += `}\n`;
  }

  // Back-relations
  const backRelations: Record<string, string[]> = {};
  for (const m of models) {
    for (const f of m.fields) {
      if (f.isRelation && f.relationModel && modelNames.has(f.relationModel)) {
        const target = f.relationModel;
        if (!backRelations[target]) backRelations[target] = [];
        backRelations[target].push(
          `  ${m.modelName.toLowerCase()}s${" ".repeat(Math.max(1, 10 - m.modelName.length))}${m.modelName}[]`
        );
      }
    }
  }

  for (const [modelName, lines] of Object.entries(backRelations)) {
    const marker = `model ${modelName} {\n  id        Int      @id @default(autoincrement())`;
    schema = schema.replace(marker, `${marker}\n${lines.join("\n")}`);
  }

  return schema;
}

// ─── Runner ───────────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const root = process.cwd();

export const runGenerator = (): void => {
  console.log("📝  Schema format:  ModelName[@vN] field:type field?:type [--routes=create,list,get,update,delete]");
  console.log("     Types    : string | int | float | boolean | datetime");
  console.log("     Optional : append ? to field name  →  bio?:string");
  console.log("     Relations: use <Model>Id:int  →  userId:int");
  console.log("     Routes   : --routes=create,list,get,update,delete  (default: all)");
  console.log("     Versioning: append @vN to model name  →  User@v2\n");

  rl.question("🧠  Enter schema:\n> ", (input) => {
    rl.close();

    if (!input || input.trim().length === 0) {
      console.error("\n❌  No input provided.\n");
      process.exit(1);
    }

    const models = parseSchema(input.trim());
    if (!models || models.length === 0) {
      console.error("\n❌  Could not parse schema.\n");
      process.exit(1);
    }

    const changelog = readChangelog(root);
    const schemaHash = hashSchema(input.trim());

    console.log(`\n⚙️   Generating backend for: ${models.map((m) => `${m.modelName}@v${m.version}`).join(", ")}...\n`);

    // Always write Prisma schema — prisma migrate is itself idempotent
    const prismaSchema = buildPrismaSchema(models);
    const prismaDir = path.join(root, "prisma");
    if (!fs.existsSync(prismaDir)) fs.mkdirSync(prismaDir, { recursive: true });
    fs.writeFileSync(path.join(prismaDir, "schema.prisma"), prismaSchema);
    console.log("  ✅  prisma/schema.prisma");

    for (const m of models) {
      const lower = m.modelName.toLowerCase();
      const fieldNames = m.fields.map((f) => f.name);

      // Skip regenerating files if nothing changed (idempotent)
      if (isUnchanged(changelog, m.modelName, fieldNames, m.routes, schemaHash)) {
        console.log(`  ⏭️   generated/*/${lower}.* — unchanged, skipped`);
        continue;
      }

      // service
      writeFile(
        path.join(root, `generated/services/${lower}.service.ts`),
        generateService(m.modelName, m.routes)
      );

      // controller — Zod validators colocated inside the controller file
      writeFile(
        path.join(root, `generated/controllers/${lower}.controller.ts`),
        generateController(m.modelName, m.fields, m.routes)
      );

      // route — only registers opted-in route methods
      writeFile(
        path.join(root, `generated/routes/${lower}.route.ts`),
        generateRoute(m.modelName, m.routes)
      );

      // standalone validation file still generated for import convenience
      writeFile(
        path.join(root, `generated/validations/${lower}.validation.ts`),
        generateValidation(m.modelName, m.fields)
      );

      // Update changelog entry
      changelog.models[m.modelName] = {
        fields: fieldNames,
        routes: m.routes,
        schemaHash,
      };

      console.log(`  ✅  generated/*/${lower}.*  [routes: ${m.routes.join(", ")}]`);
    }

    writeFile(
      path.join(root, "generated/app.ts"),
      generateApp(models.map((m) => m.modelName.toLowerCase()))
    );
    console.log("  ✅  generated/app.ts");

    writeFile(
      path.join(root, "generated/prisma/client.ts"),
      `import { PrismaClient } from "@prisma/client";\n\nexport const prisma = new PrismaClient();\n`
    );
    console.log("  ✅  generated/prisma/client.ts");

    // Persist changelog so next run knows what's already been generated
    writeChangelog(root, changelog);
    console.log("  ✅  generated.lock");

    console.log("\n✨  Backend generated successfully!\n");
    console.log("📦  Next steps:");
    console.log("   1. npx prisma migrate dev --name init");
    console.log("   2. npx ts-node generated/app.ts\n");
  });
};
