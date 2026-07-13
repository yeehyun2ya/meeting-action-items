const assert = require("node:assert/strict");
const test = require("node:test");

const { parseOpenRouterMeetingDraft, structureMeetingMinutes } = require("../dist/aiMeeting");

const originalFetch = global.fetch;
const originalOpenRouterApiKey = process.env.OPENROUTER_API_KEY;

const runWithFakeOpenRouter = async (fakeFetch, callback) => {
  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  global.fetch = fakeFetch;

  try {
    return await callback();
  } finally {
    global.fetch = originalFetch;

    if (originalOpenRouterApiKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalOpenRouterApiKey;
    }
  }
};

test("parseOpenRouterMeetingDraft accepts structured JSON with nullable fields", () => {
  const result = parseOpenRouterMeetingDraft(
    JSON.stringify({
      title: "주간 회의",
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
      ],
    }),
  );

  assert.equal(result.title, "주간 회의");
  assert.equal(result.actionItems.length, 2);
  assert.equal(result.actionItems[1].assignee, null);
  assert.equal(result.actionItems[1].dueDate, null);
});

test("parseOpenRouterMeetingDraft rejects invalid dueDate", () => {
  assert.throws(
    () =>
      parseOpenRouterMeetingDraft(
        JSON.stringify({
          title: "주간 회의",
          minutes: "회의 원문",
          actionItems: [
            {
              content: "날짜 확인",
              assignee: null,
              dueDate: "2026-02-31T00:00:00.000Z",
            },
          ],
        }),
      ),
    /AI response did not match the expected meeting structure/,
  );
});

test("structureMeetingMinutes returns structured draft when OpenRouter responds with valid JSON", async () => {
  await runWithFakeOpenRouter(
    async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "주간 회의",
                  minutes: "회의 원문",
                  actionItems: [
                    {
                      content: "배포 체크리스트 작성",
                      assignee: null,
                      dueDate: null,
                    },
                  ],
                }),
              },
            },
          ],
        }),
      ),
    async () => {
      const result = await structureMeetingMinutes("회의 원문");

      assert.equal(result.title, "주간 회의");
      assert.equal(result.actionItems[0].content, "배포 체크리스트 작성");
    },
  );
});

test("structureMeetingMinutes normalizes OpenRouter timeout errors", async () => {
  await assert.rejects(
    () =>
      runWithFakeOpenRouter(
        async () => {
          throw new DOMException("The operation timed out", "TimeoutError");
        },
        async () => structureMeetingMinutes("회의 원문"),
      ),
    { name: "OpenRouterTimeoutError" },
  );
});

test("structureMeetingMinutes normalizes OpenRouter network errors", async () => {
  await assert.rejects(
    () =>
      runWithFakeOpenRouter(
        async () => {
          throw new TypeError("fetch failed");
        },
        async () => structureMeetingMinutes("회의 원문"),
      ),
    { name: "OpenRouterNetworkError" },
  );
});

test("structureMeetingMinutes exposes retryable OpenRouter non-OK responses", async () => {
  await assert.rejects(
    () =>
      runWithFakeOpenRouter(
        async () => new Response("{}", { status: 503 }),
        async () => structureMeetingMinutes("회의 원문"),
      ),
    (error) => {
      assert.equal(error.name, "OpenRouterRequestError");
      assert.equal(error.status, 503);
      assert.equal(error.retryable, true);
      return true;
    },
  );
});

test("structureMeetingMinutes rejects missing AI message content", async () => {
  await assert.rejects(
    () =>
      runWithFakeOpenRouter(
        async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: null,
                  },
                },
              ],
            }),
          ),
        async () => structureMeetingMinutes("회의 원문"),
      ),
    /OpenRouter response did not include AI message content/,
  );
});
