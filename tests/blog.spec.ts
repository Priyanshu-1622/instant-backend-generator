/**
 * Playwright integration tests for the generated blog API.
 *
 * These tests spin up the actual generated server and hit real HTTP endpoints.
 * They catch regressions when templates or generators change.
 *
 * Run:
 *   npm run test:integration
 *
 * Requires:
 *   - examples/blog dependencies installed
 *   - Prisma migrated (npm run setup inside examples/blog)
 */

import { test, expect, request, APIRequestContext } from "@playwright/test";
import { execSync, spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

const BLOG_DIR = path.join(__dirname, "../examples/blog");
const BASE_URL = "http://localhost:3001";
const DB_PATH = path.join(BLOG_DIR, "dev.db");

let server: ChildProcess;
let api: APIRequestContext;

// ── Lifecycle ─────────────────────────────────────────────────────────────────

test.beforeAll(async ({ playwright }) => {
  // Clean slate — delete DB so migrations run fresh
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);

  // Run prisma migrate
  execSync("npx prisma migrate deploy", {
    cwd: BLOG_DIR,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: `file:${DB_PATH}` },
  });

  // Start the generated server
  server = spawn("npx", ["ts-node", "generated/app.ts"], {
    cwd: BLOG_DIR,
    env: { ...process.env, DATABASE_URL: `file:${DB_PATH}`, PORT: "3001" },
    stdio: "pipe",
  });

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server did not start")), 15000);
    server.stdout?.on("data", (data: Buffer) => {
      if (data.toString().includes("3001")) { clearTimeout(timeout); resolve(); }
    });
    server.on("error", reject);
  });

  api = await playwright.request.newContext({ baseURL: BASE_URL });
});

test.afterAll(async () => {
  await api.dispose();
  server.kill();
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
});

// ── Health check ──────────────────────────────────────────────────────────────

test("GET / returns status ok", async () => {
  const res = await api.get("/");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe("ok");
});

// ── User CRUD ─────────────────────────────────────────────────────────────────

test.describe("User", () => {
  let userId: number;

  test("POST /user creates a user", async () => {
    const res = await api.post("/user", {
      data: { name: "Priyanshu", email: "p@example.com" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe("Priyanshu");
    expect(body.email).toBe("p@example.com");
    userId = body.id;
  });

  test("POST /user returns 400 on invalid body", async () => {
    const res = await api.post("/user", { data: { name: "" } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.details).toBeDefined();
  });

  test("GET /user returns array", async () => {
    const res = await api.get("/user");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test("GET /user/:id returns user", async () => {
    const res = await api.get(`/user/${userId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(userId);
  });

  test("GET /user/:id returns 404 for missing user", async () => {
    const res = await api.get("/user/999999");
    expect(res.status()).toBe(404);
  });

  test("GET /user/:id returns 400 for non-numeric id", async () => {
    const res = await api.get("/user/abc");
    expect(res.status()).toBe(400);
  });

  test("PUT /user/:id updates user", async () => {
    const res = await api.put(`/user/${userId}`, {
      data: { name: "Priyanshu Updated" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Priyanshu Updated");
  });

  test("DELETE /user/:id deletes user", async () => {
    // Create a throwaway user
    const created = await api.post("/user", {
      data: { name: "Delete Me", email: "del@example.com" },
    });
    const { id } = await created.json();
    const res = await api.delete(`/user/${id}`);
    expect(res.status()).toBe(204);
    // Confirm gone
    const check = await api.get(`/user/${id}`);
    expect(check.status()).toBe(404);
  });
});

// ── Post CRUD ─────────────────────────────────────────────────────────────────

test.describe("Post", () => {
  let userId: number;
  let postId: number;

  test.beforeAll(async () => {
    const res = await api.post("/user", {
      data: { name: "Author", email: "author@example.com" },
    });
    userId = (await res.json()).id;
  });

  test("POST /post creates a post", async () => {
    const res = await api.post("/post", {
      data: { title: "Hello World", userId },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Hello World");
    postId = body.id;
  });

  test("GET /post returns posts with user included", async () => {
    const res = await api.get("/post");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body[0].user).toBeDefined();
  });

  test("GET /post/:id returns post with comments", async () => {
    const res = await api.get(`/post/${postId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.comments).toBeDefined();
  });
});

// ── Comment opt-in routes ─────────────────────────────────────────────────────

test.describe("Comment (opt-in: no update route)", () => {
  let userId: number;
  let postId: number;
  let commentId: number;

  test.beforeAll(async () => {
    const u = await api.post("/user", { data: { name: "Commenter", email: "c@example.com" } });
    userId = (await u.json()).id;
    const p = await api.post("/post", { data: { title: "Commented Post", userId } });
    postId = (await p.json()).id;
  });

  test("POST /comment creates a comment", async () => {
    const res = await api.post("/comment", {
      data: { text: "Great post!", postId, userId },
    });
    expect(res.status()).toBe(201);
    commentId = (await res.json()).id;
  });

  test("PUT /comment/:id returns 404 — update not generated (opt-in)", async () => {
    // The route doesn't exist — Express will 404
    const res = await api.put(`/comment/${commentId}`, { data: { text: "edited" } });
    expect(res.status()).toBe(404);
  });

  test("DELETE /comment/:id deletes comment", async () => {
    const res = await api.delete(`/comment/${commentId}`);
    expect(res.status()).toBe(204);
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────

test("unknown route returns 404", async () => {
  const res = await api.get("/nonexistent");
  expect(res.status()).toBe(404);
});
