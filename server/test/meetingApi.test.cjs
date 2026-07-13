const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const test = require("node:test");

const testPort = "4100";
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
  const serverProcess = spawn(process.execPath, ["dist/index.js"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
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

test("meeting API creates, lists, and reads meeting details", async (t) => {
  const serverProcess = await startServer();

  t.after(async () => {
    await stopServer(serverProcess);
  });

  const createResponse = await fetch(`${baseUrl}/meetings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "통합 테스트 회의",
      minutes: "회의 원문",
      actionItems: [
        {
          content: "배포 체크리스트 작성",
          assignee: "현아",
          dueDate: "2026-07-14T00:00:00.000Z",
        },
        {
          content: "AWS 환경 확인",
          assignee: null,
          dueDate: null,
        },
        {
          content: "회식 일정 공유",
          assignee: "김대리",
          dueDate: null,
        },
      ],
    }),
  });

  assert.equal(createResponse.status, 201);

  const createdMeeting = await createResponse.json();

  assert.equal(createdMeeting.actionItems.length, 3);

  const listResponse = await fetch(`${baseUrl}/meetings`);
  const meetingList = await listResponse.json();
  const listedMeeting = meetingList.find((meeting) => meeting.id === createdMeeting.id);

  assert.equal(listResponse.status, 200);
  assert.equal(listedMeeting.actionItemCount, 3);
  assert.equal(listedMeeting.actionItemPreview.length, 2);
  assert.deepEqual(Object.keys(listedMeeting.actionItemPreview[0]).sort(), ["content", "id"]);

  const detailResponse = await fetch(`${baseUrl}/meetings/${createdMeeting.id}`);
  const meetingDetail = await detailResponse.json();

  assert.equal(detailResponse.status, 200);
  assert.equal(meetingDetail.id, createdMeeting.id);
  assert.equal(meetingDetail.actionItems.length, 3);
});

test("meeting API returns JSON 400 for malformed JSON and rollover dueDate", async (t) => {
  const serverProcess = await startServer();

  t.after(async () => {
    await stopServer(serverProcess);
  });

  const malformedResponse = await fetch(`${baseUrl}/meetings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: "{bad json",
  });

  assert.equal(malformedResponse.status, 400);
  assert.deepEqual(await malformedResponse.json(), {
    error: "Request body must be valid JSON",
  });

  const rolloverResponse = await fetch(`${baseUrl}/meetings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "날짜 검증 회의",
      minutes: "회의 원문",
      actionItems: [
        {
          content: "잘못된 날짜 확인",
          assignee: "현아",
          dueDate: "2026-02-31T00:00:00.000Z",
        },
      ],
    }),
  });

  assert.equal(rolloverResponse.status, 400);
});
