#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import prompts from "prompts"; // Brought in for the interactive wizard

const program = new Command();

program
  .name("instant-backend")
  .description("CLI to instantly generate a production-ready Node.js backend")
  .version("1.0.0");

// ==========================================
// COMMAND: INIT (The Interactive Wizard)
// ==========================================
program
  .command("init")
  .description("Interactively build a schema.json file")
  .action(async () => {
    console.log("🪄 Welcome to the Schema Wizard!");

    const response = await prompts([
      {
        type: 'text',
        name: 'modelName',
        message: 'What is the name of your first model?',
        initial: 'User'
      },
      {
        type: 'confirm',
        name: 'addEmail',
        message: 'Should this model have a unique email field?',
        initial: true
      }
    ]);

    if (!response.modelName) {
      console.log("❌ Setup canceled.");
      process.exit(1);
    }

    // Build the schema object based on their answers
    const schema = {
      models: [
        {
          name: response.modelName,
          fields: [
            { name: "id", type: "String", isId: true }
          ] as any[] // <--- ADD THIS 'as any[]'
        }
      ]
    };

    // Dynamically add the email field if they said yes
    if (response.addEmail) {
      schema.models[0].fields.push({ name: "email", type: "String", isUnique: true });
    }

    // Write it to disk
    const targetDir = process.cwd();
    fs.writeFileSync(
      path.join(targetDir, "schema.json"),
      JSON.stringify(schema, null, 2)
    );

    console.log("✅ schema.json generated successfully!");
    console.log("👉 Now run: instant-backend generate");
  });


// ==========================================
// COMMAND: GENERATE (The Core Engine)
// ==========================================
program
  .command("generate")
  .alias("g")
  .description("Generate a new backend from a schema.json file")
  .action(() => {
    console.log("🚀 Initializing backend generation...");

    const targetDir = process.cwd();
    const schemaPath = path.join(targetDir, "schema.json");

    if (!fs.existsSync(schemaPath)) {
      console.error("❌ Error: Could not find 'schema.json' in the current directory.");
      process.exit(1);
    }

    try {
      const fileContent = fs.readFileSync(schemaPath, "utf-8");
      const schema = JSON.parse(fileContent);

      console.log("✅ Schema loaded successfully!");

      const outputDir = path.join(targetDir, "generated-backend");

      // 1. Create all folders
      const folders = ["", "routes", "controllers", "services", "prisma", "validations", "middlewares"];
      folders.forEach((folder) => {
        const dirPath = path.join(outputDir, folder);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      });

      // 2. Generate Auth Layer
      const middlewareCode = `
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const protect = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authorized, no token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    (req as any).user = decoded; 
    next();
  } catch (error) {
    res.status(401).json({ error: 'Not authorized, token failed' });
  }
};
      `.trim();
      fs.writeFileSync(path.join(outputDir, "middlewares", "auth.middleware.ts"), middlewareCode);

      const authControllerCode = `
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export class AuthController {
  async login(req: Request, res: Response) {
    const token = jwt.sign({ userId: 'mock-id', role: 'admin' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
    res.json({ token, message: "Use this token in the Authorization header as 'Bearer <token>'" });
  }
}
      `.trim();
      fs.writeFileSync(path.join(outputDir, "controllers", "auth.controller.ts"), authControllerCode);

      const authRouteCode = `
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
const router = Router();
const controller = new AuthController();
router.post('/login', controller.login);
export default router;
      `.trim();
      fs.writeFileSync(path.join(outputDir, "routes", "auth.routes.ts"), authRouteCode);

      // 3. Generate Models, Routes, and Logic
      let routeImports = `import authRoutes from './routes/auth.routes';\n`;
      let routeMounts = `app.use('/api/auth', authRoutes);\n`;
      let prismaCode = `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n`;

      schema.models.forEach((model: any) => {
        const modelName = model.name;
        const lowerName = modelName.toLowerCase();

        // Prisma
        prismaCode += `\nmodel ${modelName} {\n`;
        model.fields.forEach((field: any) => {
          let fieldLine = `  ${field.name} ${field.type}`;
          if (field.isId) fieldLine += ` @id @default(uuid())`;
          if (field.isUnique) fieldLine += ` @unique`;
          prismaCode += `${fieldLine}\n`;
        });
        prismaCode += `  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}\n`;

        // Zod Validation
        let zodFields = "";
        model.fields.forEach((field: any) => {
          if (field.isId) return;
          let zodType = "z.any()";
          if (field.type === "String") zodType = "z.string()";
          if (field.type === "Float" || field.type === "Int") zodType = "z.number()";
          if (field.type === "Boolean") zodType = "z.boolean()";
          zodFields += `  ${field.name}: ${zodType},\n`;
        });
        const validationCode = `import { z } from 'zod';\nexport const ${modelName}CreateSchema = z.object({\n${zodFields}});\nexport const ${modelName}UpdateSchema = ${modelName}CreateSchema.partial();`;
        fs.writeFileSync(path.join(outputDir, "validations", `${lowerName}.validation.ts`), validationCode);

        // Service
        const serviceCode = `
export class ${modelName}Service {
  async getAll() { return 'Fetched all ${modelName}s from database'; }
  async getById(id: string) { return 'Fetched ${modelName} with ID: ' + id; }
  async create(data: any) { return 'Created new ${modelName} with data: ' + JSON.stringify(data); }
  async update(id: string, data: any) { return 'Updated ${modelName} ' + id; }
  async delete(id: string) { return 'Deleted ${modelName} ' + id; }
}
        `.trim();
        fs.writeFileSync(path.join(outputDir, "services", `${lowerName}.service.ts`), serviceCode);

        // Controller
        const controllerCode = `
import { Request, Response } from 'express';
import { ${modelName}Service } from '../services/${lowerName}.service';
import { ${modelName}CreateSchema, ${modelName}UpdateSchema } from '../validations/${lowerName}.validation';

const service = new ${modelName}Service();

export class ${modelName}Controller {
  async getAll(req: Request, res: Response) { res.json({ data: await service.getAll() }); }
  async getById(req: Request, res: Response) { res.json({ data: await service.getById(req.params.id) }); }
  async create(req: Request, res: Response) {
    try { res.status(201).json({ data: await service.create(${modelName}CreateSchema.parse(req.body)) }); }
    catch (error: any) { res.status(400).json({ error: error.errors || "Invalid data" }); }
  }
  async update(req: Request, res: Response) {
    try { res.json({ data: await service.update(req.params.id, ${modelName}UpdateSchema.parse(req.body)) }); }
    catch (error: any) { res.status(400).json({ error: error.errors || "Invalid data" }); }
  }
  async delete(req: Request, res: Response) { res.json({ data: await service.delete(req.params.id) }); }
}
        `.trim();
        fs.writeFileSync(path.join(outputDir, "controllers", `${lowerName}.controller.ts`), controllerCode);

        // Routes
        const routeCode = `
import { Router } from 'express';
import { ${modelName}Controller } from '../controllers/${lowerName}.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();
const controller = new ${modelName}Controller();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', protect, controller.create);
router.put('/:id', protect, controller.update);
router.delete('/:id', protect, controller.delete);

export default router;
        `.trim();
        fs.writeFileSync(path.join(outputDir, "routes", `${lowerName}.routes.ts`), routeCode);

        routeImports += `import ${lowerName}Routes from './routes/${lowerName}.routes';\n`;
        routeMounts += `app.use('/api/${lowerName}s', ${lowerName}Routes);\n`;
      });

      fs.writeFileSync(path.join(outputDir, "prisma", "schema.prisma"), prismaCode.trim());
      
      const serverCode = `
import express from 'express';
${routeImports}
const app = express();
app.use(express.json());

${routeMounts}

// Our root health check route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Instant Backend API! 🚀' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server is running on http://localhost:\${PORT}\`);
});
      `.trim();
      fs.writeFileSync(path.join(outputDir, "index.ts"), serverCode);

      // --- Generate Configuration Files ---

      const packageJson = {
        name: "generated-backend",
        version: "1.0.0",
        main: "index.ts",
        scripts: {
          dev: "ts-node index.ts",
        },
        dependencies: {
          "@prisma/client": "^5.12.0",
          "express": "^4.19.0",
          "jsonwebtoken": "^9.0.2",
          "zod": "^3.22.4"
        },
        devDependencies: {
          "@types/express": "^4.17.21",
          "@types/jsonwebtoken": "^9.0.6",
          "@types/node": "^20.12.0",
          "prisma": "^5.12.0",
          "ts-node": "^10.9.2",
          "typescript": "^5.4.5"
        }
      };
      fs.writeFileSync(path.join(outputDir, "package.json"), JSON.stringify(packageJson, null, 2));

      const tsconfig = {
        compilerOptions: {
          target: "ES2022",
          module: "CommonJS",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true
        }
      };
      fs.writeFileSync(path.join(outputDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));

      const envCode = `DATABASE_URL="postgresql://johndoe:randompassword@localhost:5432/mydb?schema=public"\nJWT_SECRET="super-secret-key-replace-me"`;
      fs.writeFileSync(path.join(outputDir, ".env"), envCode);
      
      console.log("📄 Generated config files (package.json, tsconfig.json, .env)");
      console.log("\n🎉 Backend generation complete! Next steps:");
      console.log("  1. cd generated-backend");
      console.log("  2. npm install");
      console.log("  3. npx prisma generate");
      console.log("  4. npm run dev");

    } catch (error) {
      console.error("❌ Error: Failed to parse schema.json or write files.", error);
      process.exit(1);
    }
  });

program.parse(process.argv);