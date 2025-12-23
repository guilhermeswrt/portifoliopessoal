import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app, serverInstance } from "../src/server.js";

let server;

beforeAll(() => {
  server = serverInstance || app.listen(0);
});

afterAll(() => {
  if (!server) return;
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
});

describe("API", () => {
  it("/api/health responde com status ok", async () => {
    const res = await request(server).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("/api/profile retorna perfil", async () => {
    const res = await request(server).get("/api/profile");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
    expect(res.body).toHaveProperty("skills");
  });

  it("/api/projects retorna array", async () => {
    const res = await request(server).get("/api/projects");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("/api/projects/:id retorna 404 para id inexistente", async () => {
    const res = await request(server).get("/api/projects/nao-existe");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("POST /api/test-runs/run valida branch", async () => {
    const res = await request(server).post("/api/test-runs/run").send({ projectId: "" });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Branch é obrigatória" });
  });

  it("POST /api/test-runs/run cria um run simulado", async () => {
    const res = await request(server)
      .post("/api/test-runs/run")
      .send({ branch: "master", projectId: "" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("branch", "master");
    expect(["passed", "failed", "queued"]).toContain(res.body.status);
    expect(res.body).toHaveProperty("finishedAt");
  });

  it("/api/test-runs retorna array com runs", async () => {
    const res = await request(server).get("/api/test-runs");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("/api/actions/runs valida repoFullName", async () => {
    const res = await request(server).get("/api/actions/runs");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "repoFullName é obrigatório" });
  });

  it("/api/actions/runs retorna array (vazio em test)", async () => {
    const res = await request(server).get("/api/actions/runs").query({ repoFullName: "user/repo" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("rota inexistente retorna 404", async () => {
    const res = await request(server).get("/api/nao-existe");
    expect(res.status).toBe(404);
  });
});
