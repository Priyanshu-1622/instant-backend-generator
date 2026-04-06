# 🚀 Instant Backend Generator

Generate a production-ready backend in seconds.

---

## ⚡ What is this?

Instant Backend Generator is a CLI tool that lets you create a fully working backend (API + Database) from a simple schema input.

No boilerplate. No setup. Just run and build.

---

## 🔥 Features

* ⚡ Generate backend instantly
* 🧠 Schema-based input
* 🔗 Supports relations
* ✅ Built-in validation (Zod)
* 🗄️ Prisma + SQLite integration
* 🚀 Express server included

---

## 🚀 Quick Start

```bash
npx instant-backend
```

---

## ✍️ Example Input

```
User name:string | Post title:string userId:int
```

---

## 🎯 What it Generates

* Database schema (Prisma)
* REST APIs (CRUD)
* Validation (Zod)
* Express server

---

## 🌐 Example API

```bash
GET /user
POST /user
GET /post
POST /post
```

---

## 🧪 Example Response

```json
[
  {
    "id": 1,
    "title": "Hello",
    "userId": 1
  }
]
```

---

## 🧠 Why this exists

Backend setup is repetitive and time-consuming.

This tool reduces it from hours → seconds.

---

## 🚀 Roadmap

* [ ] Optional fields
* [ ] Enums
* [ ] Authentication
* [ ] Plugin system

---

## ⭐ Support

If you like this project, give it a star ⭐
