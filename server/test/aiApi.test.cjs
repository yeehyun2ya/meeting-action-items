const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const test = require("node:test");

const testPort = "4101";
const baseUrl = `http://localhost:${testPort}`;

const waitForServer = (serverProcess) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Server did not start in time"));
    }, 10000);

    serverProcess.stdout.on("data", (chunk) => {
      if (chunk.toString().includes(`Server is running on port ${testPort}`)) {
        clearTimeout(timeout);
        resolve();
      }
    });

    serverProcess.stderr.on("data", (chunk) => {
      const message = chunk.toString();

      if (message.includes("Error:")) {
        clearTimeout(timeout);
        reject(new Error(message));
      }
    });
  });

const startServer = async () => {
  const env = { ...process.env };
  delete env.OPENROUTER_API_KEY;

  const serverProcess = spawn(process.execPath, ["dist/index.js"], {
    cwd: process.cwd(),
    env: {
      ...env,
      PORT: testPort,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await waitForServer(serverProcess);

  return serverProcess;
};

const stopServer = async (serverProcess) => {
  if (serverProcess.exitCode !== null) {
    return;
  }

  serverProcess.kill();

  await new Promise((resolve) => {
    serverProcess.once("exit", resolve);
  });
};

test("AI structure API rejects missing minutes", async (t) => {
  const serverProcess = await startServer();

  t.after(async () => {
    await stopServer(serverProcess);
  });

  const response = await fetch(`${baseUrl}/ai/structure-meeting`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ minutes: "" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "minutes is required" });
});

test("AI structure API reports missing OpenRouter key without exposing secrets", async (t) => {
  const serverProcess = await startServer();

  t.after(async () => {
    await stopServer(serverProcess);
  });

  const response = await fetch(`${baseUrl}/ai/structure-meeting`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ minutes: "회의 원문" }),
  });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "OpenRouter API key is not configured" });
});
