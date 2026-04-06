# 🚀 Instant Backend Generator

Generate a fully working REST backend from a single schema input — in seconds.

---

## ⚡ What is this?

A CLI tool that turns a simple schema string into a complete, ready-to-run Node.js + Express + Prisma backend. No boilerplate. No setup. Just describe your models and go.

---

## 🚀 Quick Start

```bash
npx instant-backend
```

You'll be prompted to enter your schema:

```
🧠 Enter schema:
> User name:string email:string | Post title:string body?:string userId:int
```

That's it. Your backend is generated.

---

## ✍️ Schema Format

```
ModelName field:type field?:type | AnotherModel field:type refId:int
```

**Supported types:** `string` · `int` · `float` · `boolean` · `datetime`

**Optional fields:** append `?` to the field name — e.g. `bio?:string`

**Relations:** name a field `<ModelName>Id:int` — e.g. `userId:int` creates a `User` relation automatically

---

## 🎯 What Gets Generated

For each model:

| File | Location |
|---|---|
| Service (DB logic) | `generated/services/<model>.service.ts` |
| Controller (HTTP handlers) | `generated/controllers/<model>.controller.ts` |
| Routes | `generated/routes/<model>.route.ts` |
| Zod validation | `generated/validations/<model>.validation.ts` |

Plus:

- `generated/app.ts` — Express server entry point
- `generated/prisma/client.ts` — Prisma client singleton
- `prisma/schema.prisma` — Prisma schema with relations

---

## 🌐 Generated API Endpoints

For every model (e.g. `User`):

| Method | Route | Description |
|---|---|---|
| `POST` | `/user` | Create a user |
| `GET` | `/user` | Get all users |
| `GET` | `/user/:id` | Get user by ID |
| `PUT` | `/user/:id` | Update user |
| `DELETE` | `/user/:id` | Delete user |

---

## 📦 Running the Generated Backend

```bash
# 1. Install dependencies in the generated project
npm install express @prisma/client dotenv zod
npm install -D prisma ts-node typescript @types/express @types/node

# 2. Run Prisma migration
npx prisma migrate dev --name init

# 3. Start the server
npx ts-node generated/app.ts
```

Server starts on `http://localhost:3000` (or `PORT` from `.env`).

---

## 🧪 Example Request / Response

```bash
POST /user
Content-Type: application/json

{ "name": "Priyanshu", "email": "p@example.com" }
```

```json
{ "id": 1, "name": "Priyanshu", "email": "p@example.com", "createdAt": "2026-04-07T..." }
```

Validation errors return `400` with details:

```json
{
  "error": "Validation failed",
  "details": [{ "path": ["email"], "message": "Required" }]
}
```

---

## 🛣️ Roadmap

- [ ] `--output` flag to choose output directory
- [ ] Enum support
- [ ] Authentication (JWT)
- [ ] Pagination on list endpoints
- [ ] Plugin system

---

## ⭐ Support

If this saves you time, give it a star ⭐
