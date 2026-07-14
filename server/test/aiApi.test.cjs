const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { createServer } = require("node:http");
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

const startServer = async (envOverrides = {}) => {
  const env = { ...process.env };
  delete env.OPENROUTER_API_KEY;

  const serverProcess = spawn(process.execPath, ["dist/index.js"], {
    cwd: process.cwd(),
    env: {
      ...env,
      NODE_ENV: "test",
      OPENROUTER_API_KEY: "",
      PORT: testPort,
      ...envOverrides,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  await waitForServer(serverProcess);

  return serverProcess;
};

const startFakeOpenRouter = async (content) => {
  const fakeServer = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content,
            },
          },
        ],
      }),
    );
  });

  await new Promise((resolve) => {
    fakeServer.listen(0, "127.0.0.1", resolve);
  });

  const address = fakeServer.address();

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        fakeServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
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
  assert.deepEqual(await response.json(), {
    code: "VALIDATION_ERROR",
    message: "minutes is required",
    retryable: false,
  });
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
  assert.deepEqual(await response.json(), {
    code: "OPENROUTER_CONFIGURATION",
    message: "OpenRouter API key is not configured",
    retryable: false,
  });
});

test("AI structure API returns 502 when sourceQuote is not found in source minutes", async (t) => {
  const fakeOpenRouter = await startFakeOpenRouter(
    JSON.stringify({
      title: "주간 회의",
      minutes: "회의 원문",
      decisions: [
        {
          content: "없는 결정",
          sourceQuote: "원문에 없는 문장입니다.",
        },
      ],
      actionItems: [],
      discussions: [],
    }),
  );
  const serverProcess = await startServer({
    OPENROUTER_API_KEY: "test-openrouter-key",
    OPENROUTER_URL: fakeOpenRouter.url,
  });

  t.after(async () => {
    await stopServer(serverProcess);
    await fakeOpenRouter.close();
  });

  const response = await fetch(`${baseUrl}/ai/structure-meeting`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ minutes: "회의 원문" }),
  });

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    code: "AI_RESPONSE_INVALID",
    message: "AI response could not be structured",
    retryable: false,
  });
});
