/*
 * Verifica se GITHUB_TOKEN e GITHUB_USERNAME estão configurados.
 * Se não, abre o navegador na página de criação de token, pergunta usuário + token
 * uma vez e salva em .env. Executa antes de npm start / npm run dev:start.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");

const ENV_TOKEN = "GITHUB_TOKEN";
const ENV_USER = "GITHUB_USERNAME";
const TOKEN_URL = "https://github.com/settings/tokens?type=beta";
const envPath = path.join(process.cwd(), ".env");

function openBrowser(url) {
  const platform = process.platform;
  if (platform === "win32") {
    spawn("cmd", ["/c", "start", url]);
  } else if (platform === "darwin") {
    spawn("open", [url]);
  } else {
    spawn("xdg-open", [url]);
  }
}

function readKeyFromEnvFile(key) {
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, "utf8");
  const line = content
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${key}=`));
  if (!line) return null;
  const [, value] = line.split("=");
  return value ? value.trim() : null;
}

function writeKeyToEnvFile(key, value) {
  let lines = [];
  if (fs.existsSync(envPath)) {
    lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    let replaced = false;
    lines = lines.map((l) => {
      if (l.trim().startsWith(`${key}=`)) {
        replaced = true;
        return `${key}=${value}`;
      }
      return l;
    });
    if (!replaced) {
      lines.push(`${key}=${value}`);
    }
  } else {
    lines = [`${key}=${value}`];
  }
  fs.writeFileSync(envPath, lines.join("\n"), "utf8");
}

async function promptForCredentials() {
  console.log("\nCredenciais do GitHub não encontradas. Vamos configurar uma vez:");
  console.log("- Precisamos do usuário GitHub e de um token com permissão repo + workflow.");
  console.log("- Um navegador será aberto na página para criar o token.\n");
  openBrowser(TOKEN_URL);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (q) => new Promise((resolve) => rl.question(q, resolve));
  const username = (await question("Informe seu usuário GitHub: ")).trim();
  const token = (await question("Cole o GITHUB_TOKEN aqui: ")).trim();
  rl.close();
  if (!username || !token) {
    console.error("Usuário ou token vazio. Configure e tente novamente.");
    process.exit(1);
  }
  writeKeyToEnvFile(ENV_USER, username);
  writeKeyToEnvFile(ENV_TOKEN, token);
  console.log("Credenciais salvas em .env. Próximas execuções não pedirão novamente.\n");
}

async function ensureCredentials() {
  const hasEnv = process.env[ENV_TOKEN] && process.env[ENV_USER];
  if (hasEnv) return;

  const fileUser = readKeyFromEnvFile(ENV_USER);
  const fileToken = readKeyFromEnvFile(ENV_TOKEN);

  if (fileUser && fileToken) {
    process.env[ENV_USER] = fileUser;
    process.env[ENV_TOKEN] = fileToken;
    return;
  }

  await promptForCredentials();
}

ensureCredentials().catch((err) => {
  console.error("Erro ao configurar credenciais do GitHub", err);
  process.exit(1);
});
