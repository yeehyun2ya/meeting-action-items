const assert = require("node:assert/strict");
const test = require("node:test");

const { parseCreateMeetingBody } = require("../dist/meetingInput");

test("parseCreateMeetingBody accepts nullable assignee and dueDate", () => {
  const result = parseCreateMeetingBody({
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
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.decisions[0].sourceQuote, "무료 모델로 진행하기로 결정했습니다.");
  assert.equal(result.value.actionItems[0].assignee, null);
  assert.equal(result.value.actionItems[0].dueDate, null);
  assert.equal(result.value.actionItems[0].sourceQuote, "현아님은 배포 체크리스트를 작성해주세요.");
  assert.equal(result.value.discussions[0].sourceQuote, "검토 화면 구성에 대해 논의했습니다.");
});

test("parseCreateMeetingBody accepts exact UTC ISO dueDate", () => {
  const result = parseCreateMeetingBody({
    title: "주간 회의",
    minutes: "회의 원문",
    decisions: [],
    actionItems: [
      {
        content: "배포 체크리스트 작성",
        sourceQuote: "현아님은 배포 체크리스트를 2026년 7월 14일까지 작성해주세요.",
        assignee: "현아",
        dueDate: "2026-07-14T00:00:00.000Z",
        dueDateRaw: "2026년 7월 14일까지",
      },
    ],
    discussions: [],
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.actionItems[0].dueDate.toISOString(), "2026-07-14T00:00:00.000Z");
  assert.equal(result.value.actionItems[0].dueDateRaw, "2026년 7월 14일까지");
});

test("parseCreateMeetingBody accepts relative dueDateRaw with null dueDate", () => {
  const result = parseCreateMeetingBody({
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
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.actionItems[0].dueDate, null);
  assert.equal(result.value.actionItems[0].dueDateRaw, "다음 주까지");
});

test("parseCreateMeetingBody rejects rollover dates", () => {
  const result = parseCreateMeetingBody({
    title: "주간 회의",
    minutes: "회의 원문",
    decisions: [],
    actionItems: [
      {
        content: "배포 체크리스트 작성",
        sourceQuote: "현아님은 배포 체크리스트를 작성해주세요.",
        assignee: "현아",
        dueDate: "2026-02-31T00:00:00.000Z",
        dueDateRaw: "2026년 2월 31일까지",
      },
    ],
    discussions: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, "actionItems.dueDate must be an ISO date string or null");
});

test("parseCreateMeetingBody rejects blank sourceQuote for every extracted item type", () => {
  const actionItemResult = parseCreateMeetingBody({
    title: "주간 회의",
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
  });

  assert.equal(actionItemResult.ok, false);
  assert.equal(actionItemResult.message, "actionItems.sourceQuote is required");

  const decisionResult = parseCreateMeetingBody({
    title: "주간 회의",
    minutes: "회의 원문",
    decisions: [
      {
        content: "무료 모델로 진행하기로 결정",
        sourceQuote: "",
      },
    ],
    actionItems: [],
    discussions: [],
  });

  assert.equal(decisionResult.ok, false);
  assert.equal(decisionResult.message, "decisions.sourceQuote is required");

  const discussionResult = parseCreateMeetingBody({
    title: "주간 회의",
    minutes: "회의 원문",
    decisions: [],
    actionItems: [],
    discussions: [
      {
        content: "검토 화면 구성 논의",
        sourceQuote: "\t",
      },
    ],
  });

  assert.equal(discussionResult.ok, false);
  assert.equal(discussionResult.message, "discussions.sourceQuote is required");
});
