export const projectsFixture = [
  { id: "gh-1", name: "Repo1", repoUrl: "https://github.com/a/b", source: "github" }
];

export const testRunsFixture = [
  {
    id: "run-1",
    branch: "master",
    status: "failed",
    finishedAt: new Date().toISOString(),
    passed: 10,
    failed: 1,
    total: 11,
    projectId: "gh-1",
    projectName: "Repo1"
  }
];
