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
      decisions: [
        {
          content: "무료 모델로 진행하기로 결정",
          sourceQuote: "무료 모델로 진행하기로 결정했습니다.",
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
      ],
      discussions: [
        {
          content: "검토 화면 구성 논의",
          sourceQuote: "검토 화면 구성에 대해 논의했습니다.",
        },
      ],
    }),
  );

  assert.equal(result.title, "주간 회의");
  assert.equal(result.decisions[0].sourceQuote, "무료 모델로 진행하기로 결정했습니다.");
  assert.equal(result.actionItems.length, 2);
  assert.equal(result.actionItems[1].assignee, null);
  assert.equal(result.actionItems[1].dueDate, null);
  assert.equal(result.actionItems[0].dueDateRaw, "2026년 7월 14일까지");
  assert.equal(result.actionItems[1].dueDateRaw, null);
  assert.equal(result.discussions[0].sourceQuote, "검토 화면 구성에 대해 논의했습니다.");
});

test("parseOpenRouterMeetingDraft rejects invalid dueDate", () => {
  assert.throws(
    () =>
      parseOpenRouterMeetingDraft(
        JSON.stringify({
          title: "주간 회의",
          minutes: "회의 원문",
          decisions: [],
          actionItems: [
            {
              content: "날짜 확인",
              sourceQuote: "날짜 확인이 필요합니다.",
              assignee: null,
              dueDate: "2026-02-31T00:00:00.000Z",
              dueDateRaw: "2026년 2월 31일까지",
            },
          ],
          discussions: [],
        }),
      ),
    /AI response did not match the expected meeting structure/,
  );
});

test("parseOpenRouterMeetingDraft accepts relative dueDateRaw with null dueDate", () => {
  const result = parseOpenRouterMeetingDraft(
    JSON.stringify({
      title: "주간 회의",
      minutes: "회의 원문",
      decisions: [],
      actionItems: [
        {
          content: "연동 문서 작성",
          sourceQuote: "김 대리가 다음 주까지 연동 문서 작성해주세요.",
          assignee: "김 대리",
          dueDate: null,
          dueDateRaw: "다음 주까지",
        },
      ],
      discussions: [],
    }),
  );

  assert.equal(result.actionItems[0].dueDate, null);
  assert.equal(result.actionItems[0].dueDateRaw, "다음 주까지");
});

test("parseOpenRouterMeetingDraft rejects missing or blank sourceQuote", () => {
  assert.throws(
    () =>
      parseOpenRouterMeetingDraft(
        JSON.stringify({
          title: "주간 회의",
          minutes: "회의 원문",
          decisions: [
            {
              content: "무료 모델로 진행하기로 결정",
              sourceQuote: " ",
            },
          ],
          actionItems: [],
          discussions: [],
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
                  decisions: [
                    {
                      content: "무료 모델로 진행하기로 결정",
                      sourceQuote: "무료 모델로 진행하기로 결정했습니다.",
                    },
                  ],
                  actionItems: [
                    {
                      content: "배포 체크리스트 작성",
                      sourceQuote: "현아님은 배포 체크리스트를 작성해주세요.",
                      assignee: null,
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
              },
            },
          ],
        }),
      ),
    async () => {
      const result = await structureMeetingMinutes(
        [
          "무료 모델로 진행하기로 결정했습니다.",
          "현아님은 배포 체크리스트를 작성해주세요.",
          "검토 화면 구성에 대해 논의했습니다.",
        ].join("\n"),
      );

      assert.equal(result.title, "주간 회의");
      assert.equal(result.decisions[0].content, "무료 모델로 진행하기로 결정");
      assert.equal(result.actionItems[0].content, "배포 체크리스트 작성");
      assert.equal(result.discussions[0].content, "검토 화면 구성 논의");
    },
  );
});

test("structureMeetingMinutes instructs OpenRouter to preserve source quotes from the original minutes", async () => {
  await runWithFakeOpenRouter(
    async (_url, init) => {
      const requestBody = JSON.parse(init.body);
      const systemMessage = requestBody.messages.find((message) => message.role === "system");
      const userMessage = requestBody.messages.find((message) => message.role === "user");

      assert.match(systemMessage.content, /결정사항/);
      assert.match(systemMessage.content, /액션아이템/);
      assert.match(systemMessage.content, /논의사항/);
      assert.match(systemMessage.content, /sourceQuote/);
      assert.match(systemMessage.content, /실제로 존재하는 문장/);
      assert.match(systemMessage.content, /dueDateRaw/);
      assert.match(systemMessage.content, /상대적 표현은 절대 날짜로 계산하지 않는다/);
      assert.match(systemMessage.content, /단순 정보 공유/);
      assert.match(userMessage.content, /"decisions"/);
      assert.match(userMessage.content, /"discussions"/);
      assert.match(userMessage.content, /"sourceQuote"/);
      assert.match(userMessage.content, /"dueDateRaw"/);

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "주간 회의",
                  minutes: "회의 원문",
                  decisions: [],
                  actionItems: [],
                  discussions: [],
                }),
              },
            },
          ],
        }),
      );
    },
    async () => {
      await structureMeetingMinutes("회의 원문");
    },
  );
});

test("structureMeetingMinutes rejects sourceQuote that is not present in the source minutes", async () => {
  await assert.rejects(
    () =>
      runWithFakeOpenRouter(
        async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
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
                  },
                },
              ],
            }),
          ),
        async () => structureMeetingMinutes("회의 원문"),
      ),
    /decisions\[0\]\.sourceQuote="원문에 없는 문장입니다."/,
  );
});

test("structureMeetingMinutes accepts sourceQuote despite whitespace differences", async () => {
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
                  decisions: [],
                  actionItems: [
                    {
                      content: "연동 문서 작성",
                      sourceQuote: "김 대리가 다음 주까지 연동 문서 작성해주세요.",
                      assignee: "김 대리",
                      dueDate: null,
                      dueDateRaw: "다음 주까지",
                    },
                  ],
                  discussions: [],
                }),
              },
            },
          ],
        }),
      ),
    async () => {
      const result = await structureMeetingMinutes("회의 원문\n\n김 대리가   다음 주까지 연동 문서 작성해주세요.");

      assert.equal(result.actionItems[0].sourceQuote, "김 대리가 다음 주까지 연동 문서 작성해주세요.");
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
