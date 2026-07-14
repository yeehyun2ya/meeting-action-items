# 3분류 구조화 검증 (2026-07-14)

## 사용 모델
google/gemma-4-26b-a4b-it:free

## 입력 회의록
2026년 7월 14일 주간 회의

안녕하세요, 다들 모이셨네요. 시작하겠습니다.

결제 모듈은 Stripe로 가기로 확정했습니다.
김 대리가 다음 주까지 연동 문서 작성해주세요.
다국어 지원은 좀 더 검토가 필요할 것 같습니다.
박 과장이 7월 20일까지 경쟁사 분석 자료 공유하기로 했습니다.
참고로 지난달 매출은 전년 대비 12% 올랐습니다.
서버 비용 절감안은 다음 회의에서 다시 얘기하죠.

수고하셨습니다.

## 출력 JSON
{"title":"2026년 7월 14일 주간 회의","minutes":"2026년 7월 14일 주간 회의\n\n안녕하세요, 다들 모이셨네요. 시작하겠습니다.\n\n결제 모듈은 Stripe로 가기로 확정했습니다.\n김 대리가 다음 주까지 연동 문서 작성해주세요.\n다국어 지원은 좀 더 검토가 필요할 것 같습니다.\n박 과장이 7월 20일까지 경쟁사 분석 자료 공유하기로 했습니다.\n참고로 지난달 매출은 전년 대비 12% 올랐습니다.\n서버 비용 절감안은 다음 회의에서 다시 얘기하죠.\n\n수고하셨습니다.","decisions":[{"content":"결제 모듈은 Stripe로 가기로 확정했습니다.","sourceQuote":"결제 모듈은 Stripe로 가기로 확정했습니다."}],"actionItems":[{"content":"연동 문서 작성","sourceQuote":"김 대리가 다음 주까지 연동 문서 작성해주세요.","assignee":"김 대리","dueDate":"2026-07-21T00:00:00.000Z"},{"content":"경쟁사 분석 자료 공유","sourceQuote":"박 과장이 7월 20일까지 경쟁사 분석 자료 공유하기로 했습니다.","assignee":"박 과장","dueDate":"2026-07-20T00:00:00.000Z"}],"discussions":[{"content":"다국어 지원은 좀 더 검토가 필요할 것 같습니다.","sourceQuote":"다국어 지원은 좀 더 검토가 필요할 것 같습니다."},{"content":"지난달 매출은 전년 대비 12% 올랐습니다.","sourceQuote":"참고로 지난달 매출은 전년 대비 12% 올랐습니다."},{"content":"서버 비용 절감안은 다음 회의에서 다시 얘기하죠.","sourceQuote":"서버 비용 절감안은 다음 회의에서 다시 얘기하죠."}]}

## 검증 결과
| 확인 항목 | 기대 동작 | 실제 |
|---|---|---|
| "안녕하세요", "수고하셨습니다" | 어느 분류에도 포함되지 않음 | 통과. content/sourceQuote 전체에서 0건 |
| "지난달 매출 12% 상승" | 단순 정보 공유이므로 어느 분류에도 포함되지 않음 | 실패. discussions에 포함됨: content="지난달 매출은 전년 대비 12% 올랐습니다.", sourceQuote="참고로 지난달 매출은 전년 대비 12% 올랐습니다." |
| "Stripe로 확정" | decisions | 통과. decisions[0] |
| "김 대리 연동 문서" | actionItems, assignee="김 대리", dueDate=null, dueDateRaw="다음 주까지" | 실패. actionItems에는 포함됐고 assignee는 "김 대리"였지만 dueDate="2026-07-21T00:00:00.000Z"로 추정됨. dueDateRaw 필드는 응답에 없음 |
| "박 과장 경쟁사 분석" | actionItems, 7월 20일이 명시적 날짜이므로 dueDate 채워짐 | 통과. actionItems에 포함됐고 dueDate="2026-07-20T00:00:00.000Z" |
| "다국어 지원 검토" | discussions | 통과. discussions[0] |
| "서버 비용 절감안" | discussions | 통과. discussions[2] |
| 모든 항목의 sourceQuote | 원문에 그대로 존재하는 문장인가 (요약/변형되지 않았는가) | 통과. 모든 sourceQuote가 입력 회의록 문자열에 exact match |
| 중복 | 같은 문장이 두 개 이상의 분류에 나타나는가 | 통과. 중복 sourceQuote 없음 |

### sourceQuote 문자열 매칭 결과
| category | sourceQuote | 원문 exact match |
|---|---|---|
| decisions | 결제 모듈은 Stripe로 가기로 확정했습니다. | true |
| actionItems | 김 대리가 다음 주까지 연동 문서 작성해주세요. | true |
| actionItems | 박 과장이 7월 20일까지 경쟁사 분석 자료 공유하기로 했습니다. | true |
| discussions | 다국어 지원은 좀 더 검토가 필요할 것 같습니다. | true |
| discussions | 참고로 지난달 매출은 전년 대비 12% 올랐습니다. | true |
| discussions | 서버 비용 절감안은 다음 회의에서 다시 얘기하죠. | true |

## 발견된 문제
- 첫 번째 실제 호출은 OpenRouter 응답 지연으로 30초 timeout이 발생했고, 서버는 `{"error":"Failed to structure meeting minutes"}`를 반환했다. 같은 입력으로 재시도했을 때 성공 응답을 받았다.
- `dueDateRaw` 필드가 현재 응답 JSON에 없다.
- "김 대리가 다음 주까지..." 항목에서 "다음 주까지"는 명시적 날짜가 아닌 상대 표현인데, `dueDate`가 `2026-07-21T00:00:00.000Z`로 채워졌다. 기대 동작은 `dueDate=null`, `dueDateRaw="다음 주까지"`였다.
- "참고로 지난달 매출은 전년 대비 12% 올랐습니다."가 단순 정보 공유인데 `discussions`로 분류됐다. 기대 동작은 어느 분류에도 포함하지 않는 것이었다.

## 조치
조치 없음. 프롬프트와 스키마는 이 검증 중 수정하지 않았다.

---

## 재검증 결과 (dueDateRaw, discussions 축소, sourceQuote 서버 검증 반영 후)

### 조치
- `ActionItem.dueDateRaw` 필드를 추가했다.
- AI 응답 스키마에 `dueDateRaw`를 필수 nullable 필드로 추가했다.
- prompt에 상대 날짜는 절대 날짜로 계산하지 말고 `dueDate=null`, `dueDateRaw=원문 표현`으로 반환하라고 명시했다.
- prompt의 discussions 정의를 "안건에 대해 논의됐으나 결론이 나지 않은 내용"으로 좁혔다.
- prompt에 인사말, 잡담, 단순 정보 공유, 배경 설명은 어느 분류에도 포함하지 말라고 명시했다.
- `structureMeetingMinutes`에서 Zod 검증 통과 후 모든 `sourceQuote`가 입력 회의록 원문에 포함되는지 서버에서 검증하도록 했다.
- sourceQuote 비교는 양쪽 문자열에 대해 `trim()` 후 연속 공백/줄바꿈/탭을 단일 공백으로 정규화한 뒤 `includes()`로 확인한다.

### 출력 JSON
{"title":"2026년 7월 14일 주간 회의","minutes":"2026년 7월 14일 주간 회의","decisions":[{"content":"결제 모듈은 Stripe로 결정함","sourceQuote":"결제 모듈은 Stripe로 가기로 확정했습니다."}],"actionItems":[{"content":"연동 문서 작성","sourceQuote":"김 대리가 다음 주까지 연동 문서 작성해주세요.","assignee":"김 대리","dueDate":null,"dueDateRaw":"다음 주까지"},{"content":"경쟁사 분석 자료 공유","sourceQuote":"박 과장이 7월 20일까지 경쟁사 분석 자료 공유하기로 했습니다.","assignee":"박 과장","dueDate":"2026-07-20T00:00:00.000Z","dueDateRaw":"7월 20일"}],"discussions":[{"content":"다국어 지원 검토 필요","sourceQuote":"다국어 지원은 좀 더 검토가 필요할 것 같습니다."},{"content":"서버 비용 절감안 논의 예정","sourceQuote":"서버 비용 절감안은 다음 회의에서 다시 얘기하죠."}]}

### Before / After 비교
| 확인 항목 | 이전 검증 | 재검증 |
|---|---|---|
| "안녕하세요", "수고하셨습니다" | 통과. 어느 분류에도 없음 | 통과. 어느 분류에도 없음 |
| "지난달 매출 12% 상승" | 실패. discussions에 포함됨 | 통과. 어느 분류에도 없음 |
| "Stripe로 확정" | 통과. decisions | 통과. decisions |
| "김 대리 연동 문서" | 실패. dueDate가 `2026-07-21T00:00:00.000Z`로 추정됐고 dueDateRaw 없음 | 통과. `dueDate=null`, `dueDateRaw="다음 주까지"` |
| "박 과장 경쟁사 분석" | 통과. dueDate=`2026-07-20T00:00:00.000Z` | 통과. dueDate=`2026-07-20T00:00:00.000Z`, dueDateRaw=`7월 20일` |
| "다국어 지원 검토" | 통과. discussions | 통과. discussions |
| "서버 비용 절감안" | 통과. discussions | 통과. discussions |
| 모든 항목의 sourceQuote | 통과. 모든 sourceQuote가 원문 exact match | 통과. 모든 sourceQuote가 원문 exact match이며 서버 검증도 통과 |
| 중복 | 통과. 중복 sourceQuote 없음 | 통과. 중복 sourceQuote 없음 |

### sourceQuote 문자열 매칭 결과
| category | sourceQuote | 원문 exact match |
|---|---|---|
| decisions | 결제 모듈은 Stripe로 가기로 확정했습니다. | true |
| actionItems | 김 대리가 다음 주까지 연동 문서 작성해주세요. | true |
| actionItems | 박 과장이 7월 20일까지 경쟁사 분석 자료 공유하기로 했습니다. | true |
| discussions | 다국어 지원은 좀 더 검토가 필요할 것 같습니다. | true |
| discussions | 서버 비용 절감안은 다음 회의에서 다시 얘기하죠. | true |

### 발견된 문제
- 첫 번째 재검증 호출은 OpenRouter 응답 지연으로 30초 timeout이 발생했다. 같은 입력으로 재시도했을 때 성공 응답을 받았다.
- 재검증 성공 응답 기준으로 분류, dueDateRaw, sourceQuote 원문 포함 여부에서 기대와 다른 항목은 발견되지 않았다.
