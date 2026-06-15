import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const baseURL = "http://127.0.0.1:4180";
const vite = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4180"],
  { stdio: "inherit" }
);

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {
      // O Vite ainda está iniciando.
    }
    await wait(250);
  }
  throw new Error("O servidor de testes não iniciou.");
}

try {
  await waitForServer();
  const playwright = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", "--workers=1"],
    {
      stdio: "inherit",
      env: { ...process.env, E2E_BASE_URL: baseURL }
    }
  );
  const exitCode = await new Promise(resolve => playwright.on("exit", resolve));
  process.exitCode = exitCode ?? 1;
} finally {
  vite.kill();
}
