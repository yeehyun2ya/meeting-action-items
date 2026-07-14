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
      decisions: [
        {
          content: "무료 모델로 진행하기로 결정",
          sourceQuote: "무료 모델로 진행하기로 결정했습니다.",
        },
        {
          content: "검토 화면을 제공하기로 결정",
          sourceQuote: "AI 결과 검토 화면을 제공하기로 결정했습니다.",
        },
      ],
      actionItems: [
        {
          content: "배포 체크리스트 작성",
          sourceQuote: "현아님은 배포 체크리스트를 작성해주세요.",
          assignee: "현아",
          dueDate: "2026-07-14T00:00:00.000Z",
          dueDateRaw: "2026년 7월 14일까지",
        },
        {
          content: "AWS 환경 확인",
          sourceQuote: "AWS 환경 확인이 필요합니다.",
          assignee: null,
          dueDate: null,
          dueDateRaw: null,
        },
        {
          content: "회식 일정 공유",
          sourceQuote: "김대리님은 회식 일정을 공유해주세요.",
          assignee: "김대리",
          dueDate: null,
          dueDateRaw: null,
        },
      ],
      discussions: [
        {
          content: "검토 화면 구성 논의",
          sourceQuote: "검토 화면 구성에 대해 논의했습니다.",
        },
      ],
    }),
  });

  assert.equal(createResponse.status, 201);

  const createdMeeting = await createResponse.json();

  assert.equal(createdMeeting.decisions.length, 2);
  assert.equal(createdMeeting.actionItems.length, 3);
  assert.equal(createdMeeting.actionItems[0].sourceQuote, "현아님은 배포 체크리스트를 작성해주세요.");
  assert.equal(createdMeeting.actionItems[0].dueDateRaw, "2026년 7월 14일까지");
  assert.equal(createdMeeting.discussions.length, 1);

  const listResponse = await fetch(`${baseUrl}/meetings`);
  const meetingList = await listResponse.json();
  const listedMeeting = meetingList.find((meeting) => meeting.id === createdMeeting.id);

  assert.equal(listResponse.status, 200);
  assert.equal(listedMeeting.decisionCount, 2);
  assert.equal(listedMeeting.decisionPreview.length, 2);
  assert.equal(listedMeeting.actionItemCount, 3);
  assert.equal(listedMeeting.actionItemPreview.length, 2);
  assert.equal(listedMeeting.discussionCount, 1);
  assert.equal(listedMeeting.discussionPreview.length, 1);
  assert.deepEqual(Object.keys(listedMeeting.actionItemPreview[0]).sort(), [
    "content",
    "dueDateRaw",
    "id",
    "sourceQuote",
  ]);

  const detailResponse = await fetch(`${baseUrl}/meetings/${createdMeeting.id}`);
  const meetingDetail = await detailResponse.json();

  assert.equal(detailResponse.status, 200);
  assert.equal(meetingDetail.id, createdMeeting.id);
  assert.equal(meetingDetail.decisions.length, 2);
  assert.equal(meetingDetail.decisions[0].sourceQuote, "무료 모델로 진행하기로 결정했습니다.");
  assert.equal(meetingDetail.actionItems.length, 3);
  assert.equal(meetingDetail.actionItems[0].sourceQuote, "현아님은 배포 체크리스트를 작성해주세요.");
  assert.equal(meetingDetail.actionItems[0].dueDateRaw, "2026년 7월 14일까지");
  assert.equal(meetingDetail.discussions.length, 1);
  assert.equal(meetingDetail.discussions[0].sourceQuote, "검토 화면 구성에 대해 논의했습니다.");
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
      decisions: [],
      actionItems: [
        {
          content: "잘못된 날짜 확인",
          sourceQuote: "현아님은 잘못된 날짜를 확인해주세요.",
          assignee: "현아",
          dueDate: "2026-02-31T00:00:00.000Z",
          dueDateRaw: "2026년 2월 31일까지",
        },
      ],
      discussions: [],
    }),
  });

  assert.equal(rolloverResponse.status, 400);
});

test("meeting API rejects blank sourceQuote", async (t) => {
  const serverProcess = await startServer();

  t.after(async () => {
    await stopServer(serverProcess);
  });

  const response = await fetch(`${baseUrl}/meetings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "근거 검증 회의",
      minutes: "회의 원문",
      decisions: [],
      actionItems: [
        {
          content: "배포 체크리스트 작성",
          sourceQuote: " ",
          assignee: "현아",
          dueDate: null,
          dueDateRaw: null,
        },
      ],
      discussions: [],
    }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "actionItems.sourceQuote is required" });
});
