const assert = require("node:assert/strict");
const test = require("node:test");

const { parseCreateMeetingBody } = require("../dist/meetingInput");

test("parseCreateMeetingBody accepts nullable assignee and dueDate", () => {
  const result = parseCreateMeetingBody({
    title: "주간 회의",
    minutes: "회의 원문",
    actionItems: [
      {
        content: "배포 체크리스트 작성",
        assignee: null,
        dueDate: null,
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.actionItems[0].assignee, null);
  assert.equal(result.value.actionItems[0].dueDate, null);
});

test("parseCreateMeetingBody accepts exact UTC ISO dueDate", () => {
  const result = parseCreateMeetingBody({
    title: "주간 회의",
    minutes: "회의 원문",
    actionItems: [
      {
        content: "배포 체크리스트 작성",
        assignee: "현아",
        dueDate: "2026-07-14T00:00:00.000Z",
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.actionItems[0].dueDate.toISOString(), "2026-07-14T00:00:00.000Z");
});

test("parseCreateMeetingBody rejects rollover dates", () => {
  const result = parseCreateMeetingBody({
    title: "주간 회의",
    minutes: "회의 원문",
    actionItems: [
      {
        content: "배포 체크리스트 작성",
        assignee: "현아",
        dueDate: "2026-02-31T00:00:00.000Z",
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, "actionItems.dueDate must be an ISO date string or null");
});
