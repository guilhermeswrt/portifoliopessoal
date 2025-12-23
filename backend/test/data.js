export const profile = {
  name: "Teste",
  title: "Test Profile",
  location: "Test City",
  summary: "Dados de teste",
  contacts: {
    email: "test@example.com",
    phone: "+00 00000-0000",
    github: "https://github.com/test",
    linkedin: "https://www.linkedin.com/in/test"
  },
  skills: ["Test"]
};

// Projeto fake para testes E2E (Playwright). Não depende de GitHub Token.
export const projects = [
  {
    id: "gh-e2e-1",
    name: "E2E Repo",
    description: "Projeto fake para E2E",
    tech: ["CI"],
    liveUrl: "https://example.com",
    repoUrl: "https://github.com/example/e2e-repo",
    demoUrl: "",
    repoFullName: "example/e2e-repo",
    source: "github"
  }
];
