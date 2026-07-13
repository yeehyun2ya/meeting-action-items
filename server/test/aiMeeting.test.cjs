const assert = require("node:assert/strict");
const test = require("node:test");

const { parseOpenRouterMeetingDraft } = require("../dist/aiMeeting");

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
