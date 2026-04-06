import readline from "readline";
import fs from "fs";
import path from "path";

import { generateService } from "../generator/service.generator";
import { generateController } from "../generator/controller.generator";
import { generateRoute } from "../generator/route.generator";
import { generateApp } from "../generator/app.generator";
import { generateValidation } from "../generator/validation.generator";
import { writeFile } from "../utils/fileWriter";

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Schema parser ────────────────────────────────────────────────────────────

function parseSchema(input: string): ParsedModel[] | null {
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

    const modelName = capitalise(parts[0]);
    const rawFields = parts.slice(1);

    const fields: ParsedField[] = rawFields
      .map((f) => {
        const [rawName, type] = f.split(":");
        if (!rawName || !type) {
          console.error(`❌  Invalid field "${f}" — expected name:type`);
          return null;
        }

        const isOptional = rawName.endsWith("?");
        const name = rawName.replace("?", "");

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

    models.push({ modelName, fields });
  }

  return models;
}

// ─── Prisma schema builder ────────────────────────────────────────────────────

const PRISMA_TYPE_MAP: Record<string, string> = {
  string: "String",
  int: "Int",
  number: "Int",
  float: "Float",
  boolean: "Boolean",
  bool: "Boolean",
  datetime: "DateTime",
};

function buildPrismaSchema(models: ParsedModel[]): string {
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
    schema += `\nmodel ${m.modelName} {\n`;
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

  // Inject back-relations
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
    schema = schema.replace(
      marker,
      `${marker}\n${lines.join("\n")}`
    );
  }

  return schema;
}

// ─── Runner ───────────────────────────────────────────────────────────────────

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const root = process.cwd();

export const runGenerator = (): void => {
  console.log("📝  Schema format:  ModelName field:type field?:type | AnotherModel ...");
  console.log("     Types: string | int | float | boolean | datetime");
  console.log("     Append ? to mark a field optional  (e.g. bio?:string)");
  console.log("     Use <Model>Id:int to create a relation  (e.g. userId:int)\n");

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

    console.log(`\n⚙️   Generating backend for: ${models.map((m) => m.modelName).join(", ")}...\n`);

    // Prisma schema
    const prismaSchema = buildPrismaSchema(models);
    const prismaDir = path.join(root, "prisma");
    if (!fs.existsSync(prismaDir)) fs.mkdirSync(prismaDir, { recursive: true });
    fs.writeFileSync(path.join(prismaDir, "schema.prisma"), prismaSchema);
    console.log("  ✅  prisma/schema.prisma");

    // Per-model files
    for (const m of models) {
      const lower = m.modelName.toLowerCase();

      writeFile(path.join(root, `generated/services/${lower}.service.ts`), generateService(m.modelName));
      writeFile(path.join(root, `generated/controllers/${lower}.controller.ts`), generateController(m.modelName));
      writeFile(path.join(root, `generated/routes/${lower}.route.ts`), generateRoute(m.modelName));
      writeFile(path.join(root, `generated/validations/${lower}.validation.ts`), generateValidation(m.modelName, m.fields));

      console.log(`  ✅  generated/*/${lower}.*`);
    }

    // app.ts
    writeFile(path.join(root, "generated/app.ts"), generateApp(models.map((m) => m.modelName.toLowerCase())));
    console.log("  ✅  generated/app.ts");

    // Prisma client
    writeFile(
      path.join(root, "generated/prisma/client.ts"),
      `import { PrismaClient } from "@prisma/client";\n\nexport const prisma = new PrismaClient();\n`
    );
    console.log("  ✅  generated/prisma/client.ts");

    console.log("\n✨  Backend generated successfully!\n");
    console.log("📦  Next steps:");
    console.log("   1. npx prisma migrate dev --name init");
    console.log("   2. npx ts-node generated/app.ts\n");
  });
};
