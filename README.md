<div align="center">

<!-- Banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:7aa2f7,100:bb9af7&height=160&section=header&text=Instant%20Backend%20Generator&fontSize=36&fontColor=ffffff&fontAlignY=45&desc=Schema%20in.%20Full%20REST%20backend%20out.&descAlignY=65&descSize=16" width="100%" alt="banner"/>

<br/>

<!-- Badges -->
[![npm version](https://img.shields.io/badge/npm-1.0.0-bb9af7?style=flat-square&logo=npm&logoColor=white)](https://www.npmjs.com/package/instant-backend-generator)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-7aa2f7?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-9ece6a?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Zod](https://img.shields.io/badge/Zod-3.x-f7768e?style=flat-square&logo=zod&logoColor=white)](https://zod.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-e0af68?style=flat-square)](LICENSE)

<br/>

> **Turn a one-line schema into a fully working Express + Prisma + Zod backend — in seconds.**  
> No boilerplate. No copy-pasting. Just describe your models and go.

<br/>

</div>

---

## ⚡ Quick Start

```bash
npx instant-backend
```

You'll see:

```
🧠  Enter schema:
> User name:string email:string | Post title:string userId:int
```

That's literally it. Your entire backend is generated.

---

## 🎬 Demo

<!-- Replace the src below with your actual GIF once recorded with a tool like Terminalizer, VHS, or Asciinema2gif -->

```
npx instant-backend

🚀  Instant Backend Generator
   Generate a full REST backend from a schema — in seconds.

🧠  Enter schema:
> User name:string email:string | Post title:string userId:int

⚙️   Generating backend for: User, Post...

  ✅  prisma/schema.prisma
  ✅  generated/*/user.*
  ✅  generated/*/post.*
  ✅  generated/app.ts
  ✅  generated/prisma/client.ts

✨  Backend generated successfully!

📦  Next steps:
   1. npx prisma migrate dev --name init
   2. npx ts-node generated/app.ts
```

> 💡 **Tip:** Record your own demo with [`vhs`](https://github.com/charmbracelet/vhs) or [`terminalizer`](https://terminalizer.com/) and drop the GIF here.

---

## ✍️ Schema Format

```
ModelName field:type field?:type | AnotherModel field:type refId:int
```

| Syntax | Meaning | Example |
|---|---|---|
| `name:string` | Required string field | `title:string` |
| `age:int` | Required integer field | `score:int` |
| `bio?:string` | Optional field | `bio?:string` |
| `userId:int` | Foreign key → creates relation | `userId:int` |

**Supported types:** `string` · `int` · `float` · `boolean` · `datetime`

### Example schemas

```bash
# Single model
User name:string email:string age?:int

# With relations
User name:string email:string | Post title:string body?:string userId:int

# Multiple models
User name:string | Post title:string userId:int | Comment text:string postId:int
```

---

## 🎯 What Gets Generated

For every model (e.g. `User`):

```
generated/
├── app.ts                          ← Express server entry point
├── prisma/
│   └── client.ts                   ← Prisma client singleton
├── services/
│   └── user.service.ts             ← DB logic (CRUD)
├── controllers/
│   └── user.controller.ts          ← HTTP handlers + error handling
├── routes/
│   └── user.route.ts               ← Express router (5 endpoints)
└── validations/
    └── user.validation.ts          ← Zod create + update schemas

prisma/
└── schema.prisma                   ← Auto-generated with relations
```

---

## 🌐 Generated API

For every model, you get **5 endpoints out of the box:**

| Method | Route | Description | Status |
|---|---|---|---|
| `POST` | `/user` | Create a user | `201` |
| `GET` | `/user` | Get all users | `200` |
| `GET` | `/user/:id` | Get user by ID | `200 / 404` |
| `PUT` | `/user/:id` | Update user | `200 / 404` |
| `DELETE` | `/user/:id` | Delete user | `204` |

Validation errors return `400` with details. Server errors return `500`. Not found returns `404`.

---

## 🧪 Example Request & Response

**Create a user:**
```bash
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{ "name": "Priyanshu", "email": "p@example.com" }'
```

```json
{
  "id": 1,
  "name": "Priyanshu",
  "email": "p@example.com",
  "createdAt": "2026-04-07T10:30:00.000Z"
}
```

**Validation error:**
```json
{
  "error": "Validation failed",
  "details": [
    { "path": ["email"], "message": "Required" }
  ]
}
```

---

## 📦 Running the Generated Backend

```bash
# 1. Install runtime dependencies
npm install express @prisma/client dotenv zod
npm install -D prisma ts-node typescript @types/express @types/node

# 2. Run Prisma migration
npx prisma migrate dev --name init

# 3. Start the server
npx ts-node generated/app.ts
# 🚀 Server running on http://localhost:3000
```

Set your `PORT` in `.env` — defaults to `3000`.

---

## 🏗️ Architecture

The generated backend follows clean architecture:

```
Request → Route → Controller → Service → Prisma → SQLite
                     ↑
              Zod Validation
```

- **Routes** — thin, just wires URLs to controllers  
- **Controllers** — handle HTTP: parse, validate, respond, catch errors  
- **Services** — pure DB logic, no HTTP awareness  
- **Validations** — Zod schemas, auto-split into `create` (strict) + `update` (all optional)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5 |
| Server | Express 4 |
| ORM | Prisma 6 |
| Database | SQLite (via better-sqlite3) |
| Validation | Zod 3 |
| Templates | Handlebars |
| CLI | Node readline |

---

## 🗺️ Roadmap

- [x] Full CRUD (POST, GET all, GET by ID, PUT, DELETE)  
- [x] Zod validation with proper `400` errors  
- [x] Auto-generated Prisma relations  
- [x] Optional fields (`?`)  
- [ ] `--output` flag to set output directory  
- [ ] `--db` flag to choose database (PostgreSQL, MySQL)  
- [ ] Enum support  
- [ ] JWT Authentication scaffold  
- [ ] Pagination on list endpoints  
- [ ] OpenAPI / Swagger output  

---

## 🤝 Contributing

PRs welcome. Open an issue first for large changes.

```bash
git clone https://github.com/your-username/instant-backend-generator
cd instant-backend-generator
npm install
npm run dev
```

---

## 📄 License

MIT © [Priyanshu](https://github.com/your-username)

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:bb9af7,100:7aa2f7&height=100&section=footer" width="100%" alt="footer"/>

**If this saves you time, give it a star ⭐**

</div>
