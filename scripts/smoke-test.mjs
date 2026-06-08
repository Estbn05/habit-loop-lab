import { spawn } from "node:child_process";

const port = 5174;
const baseUrl = `http://127.0.0.1:${port}`;

const server = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: "pipe",
});

const timeout = setTimeout(() => {
  server.kill();
  throw new Error("Server did not respond in time.");
}, 8000);

try {
  await waitForServer();

  const checks = [
    ["/", "manifest.webmanifest"],
    ["/app.js", "renderAppNavigation"],
    ["/styles.css", "automaticity-stages"],
    ["/manifest.webmanifest", "\"display\": \"standalone\""],
    ["/service-worker.js", "habit-loop-lab-pwa"],
  ];

  for (const [path, expected] of checks) {
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`${path} returned ${response.status}`);
    }

    const body = await response.text();
    if (!body.includes(expected)) {
      throw new Error(`${path} did not include expected content: ${expected}`);
    }
  }

  console.log("Smoke test passed.");
} finally {
  clearTimeout(timeout);
  server.kill();
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  throw new Error("Server did not become ready.");
}
