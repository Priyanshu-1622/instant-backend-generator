import readline from "readline";
import fs from "fs";
import path from "path";

import { generateService } from "../generator/service.generator";
import { generateController } from "../generator/controller.generator";
import { generateRoute } from "../generator/route.generator";
import { generateApp } from "../generator/app.generator";
import { generateValidation } from "../generator/validation.generator";
import { writeFile } from "../utils/fileWriter";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const root = process.cwd();

export const runGenerator = () => {
  rl.question(
    "\n🧠 Enter schema (e.g. User name:string | Post title:string userId:int):\n> ",
    (input) => {
      // ❌ Empty input check
      if (!input || input.trim().length === 0) {
        console.log("❌ No input provided\n");
        rl.close();
        return;
      }

      console.log("\n⚙️ Generating backend...\n");

      const modelsInput = input
        .split("|")
        .map((m) => m.trim())
        .filter(Boolean);

      if (modelsInput.length === 0) {
        console.log("❌ Invalid schema format\n");
        rl.close();
        return;
      }

      const models = modelsInput.map((modelStr) => {
        const parts = modelStr.split(" ").filter(Boolean);

        const modelName = parts[0];
        if (!modelName) {
          console.log("❌ Missing model name\n");
          return;
        }

        const fields = parts.slice(1);

        const parsedFields = fields.map((f) => {
          const [rawName, type] = f.split(":");

          if (!rawName || !type) {
            console.log(`❌ Invalid field format: ${f}`);
            return;
          }

          const isOptional = rawName.includes("?");
          const name = rawName.replace("?", "");

          return { name, type, isOptional };
        });

        return { modelName, fields: parsedFields };
      });

      // 🧱 Generate Prisma schema
      const generatePrismaSchema = (models: any[]) => {
        let schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
}
`;

        models.forEach((m) => {
          schema += `\nmodel ${m.modelName} {\n`;
          schema += `  id Int @id @default(autoincrement())\n`;

          m.fields.forEach((f: any) => {
            if (f.name.toLowerCase().includes("id") && f.name !== "id") {
              const relationModel = f.name.replace("Id", "");

              schema += `  ${f.name} Int${f.isOptional ? "?" : ""}\n`;
              schema += `  ${relationModel.toLowerCase()} ${relationModel}? @relation(fields: [${f.name}], references: [id])\n`;
            } else {
              const type = f.type === "string" ? "String" : "Int";
              schema += `  ${f.name} ${type}${f.isOptional ? "?" : ""}\n`;
            }
          });

          schema += `}\n`;
        });

        return schema;
      };

      const prismaSchema = generatePrismaSchema(models);

      fs.writeFileSync(
        path.join(root, "prisma/schema.prisma"),
        prismaSchema
      );

      // 🧱 Generate backend files
      models.forEach((m: any) => {
        const model = m.modelName;
        const lower = model.toLowerCase();

        const service = generateService(model);
        const controller = generateController(model);
        const route = generateRoute(model);
        const validation = generateValidation(model, m.fields);

        writeFile(
          path.join(root, `generated/services/${lower}.service.ts`),
          service
        );

        writeFile(
          path.join(root, `generated/controllers/${lower}.controller.ts`),
          controller
        );

        writeFile(
          path.join(root, `generated/routes/${lower}.route.ts`),
          route
        );

        writeFile(
          path.join(root, `generated/validations/${lower}.validation.ts`),
          validation
        );
      });

      // 🧱 Generate app.ts
      const modelNames = models.map((m: any) =>
        m.modelName.toLowerCase()
      );

      const app = generateApp(modelNames);

      writeFile(path.join(root, "generated/app.ts"), app);

      // 🧱 Prisma client for generated
      writeFile(
        path.join(root, "generated/prisma/client.ts"),
        `import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();`
      );

      console.log("\n✨ Backend generated successfully!\n");
      console.log("📦 Files created in /generated folder");
      console.log("🚀 Run your server:");
      console.log("   npx ts-node generated/app.ts\n");

      rl.close();
    }
  );
};