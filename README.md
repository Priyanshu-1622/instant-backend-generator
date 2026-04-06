# 🚀 Instant Backend Generator

**The zero-config CLI to scaffold production-ready Node.js APIs in seconds.**

Building a backend from scratch usually takes hours of repetitive setup. **Instant Backend Generator** automates the boilerplate, providing you with a clean, scalable, and secure foundation based on industry-standard best practices.

---

## ✨ Key Features

* **🏗️ Clean Architecture:** Automatically scaffolds a layered structure (**Routes → Controllers → Services**) for maximum maintainability.
* **💎 Database Ready:** Generates a complete **Prisma** schema with PostgreSQL support, including pre-configured models.
* **🛡️ Type-Safe Validation:** Integrated **Zod** schemas to validate incoming request data before it hits your logic.
* **🔒 Secure by Default:** Built-in **JWT Authentication** middleware to protect sensitive endpoints.
* **🪄 Interactive Wizard:** A terminal-based UI to define your data models without writing a single line of JSON.

---

## 🛠️ Getting Started

You don't even need to install it globally to test it. You can run it directly using `npx`.

### 1. Initialize your Schema
Run the interactive wizard to define your models (e.g., User, Product, Transaction).

```bash
npx instant-backend-generator init

2. Generate the Codebase
Once your schema.json is ready, trigger the engine to build your backend.
Bash
npx instant-backend-generator generate

3. Launch the Generated API
Bash
cd generated-backend
npm install
npx prisma generate
npm run dev

📂 Generated Project Structure
The CLI produces a professional directory layout designed for scale:
generated-backend/
├── src/
│   ├── controllers/      # Request & Response handling
│   ├── services/         # Business logic & DB queries
│   ├── routes/           # Endpoint definitions
│   ├── validations/      # Zod validation schemas
│   ├── middlewares/      # JWT & Auth logic
│   └── index.ts          # Express Server Entry
├── prisma/               # Database schemas
├── .env                  # Environment configuration
└── tsconfig.json         # TypeScript rules

🚀 Why Use This?
Most generators dump everything into one file. This tool is built for developers who need:

1. Separation of Concerns: Keep logic out of your route files.

2. Strict Typing: Full TypeScript support across every layer.

3. Speed: Go from idea to a working API in under 60 seconds.

🏗️ Built With
1. Node.js - Runtime environment

2. TypeScript - Type safety

3. Commander.js - CLI framework

4, Prompts - Interactive terminal UI

📄 License
This project is licensed under the MIT License. Feel free to use it for personal or commercial projects.