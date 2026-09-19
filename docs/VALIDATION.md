# 검증 기록

2026-09-20 · macOS · Chrome 152.0.7977.64 · Node.js 26.6.0

## 통과

- 단위·회귀 테스트 14개 (`npm test`).
- JavaScript 문법 검사 (`npm run check`).
- 사용자 Chrome에 unpacked 확장 로드 및 실제 탭 미리보기.
- 별도 실제 Chrome 창의 10개 검증: 미리보기, 그룹 생성, 그룹 접기, 고정 탭 보호, 기존 그룹 보호, 그룹 되돌리기, 중복 닫기, URL 복원, 변경된 계획 거부, 다른 창의 탭 유지.
- 실제 검증 중 발견한 Chrome 저장소 객체 키 순서 차이와 비활성 창 그룹 생성 문제를 수정하고 회귀 테스트를 추가.
- Jev 요청 계약, URL 민감 구성요소 제거, 길이 제한, 20개 배치, 100개 상한, 오류 응답, 응답 본문 timeout은 모의 네트워크로 검증.

## 재현

`npm test`와 `npm run check`를 실행하세요. 실제 Chrome 검증은 확장 페이지 `popup.html`의 개발자 도구 콘솔에서 `tests/chrome-smoke.js` 내용을 실행합니다. 테스트 전용 창을 만들고 종료하며 AI API를 호출하지 않습니다. 마지막 그룹 되돌리기와 중복 복원 기록은 테스트 기록으로 교체됩니다.

## 실제 Jev 및 사용자 탭 검증

사용자가 키 한도를 조정한 뒤 실제 Chrome 확장 페이지에서 `classifyTabs`로 OpenRouter를 호출했습니다. 사용자의 실제 열린 탭을 대상으로 총 10회 HTTP 200, 응답 모델 `typesafe/jev-1.13-20260917`을 확인했습니다. 브라우저에서의 인증·네트워크 요청·응답 파싱까지 통과했습니다.

- 조회 시점: 6개 창, 전체 213개 탭, 분류 대상 190개.
- 적용: 158개 탭을 28개 그룹으로 생성하고 모두 접음.
- 검증: 생성 그룹 28개 일치, 닫힌 탭 0개, 창 이동 0개.
- 공급자 보고 비용 합계: $0.002462166.
- 100개 입력 제한에 맞춰 어댑터를 100개/90개로 나누어 호출한 뒤, 통합 정리안을 확장의 적용 엔진으로 실행했습니다. 당시 팝업 단일 AI 요청은 최대 100개였습니다.
- API 키와 실제 탭 제목·주소는 저장소나 이 기록에 포함하지 않았습니다. 그룹 되돌리기는 Chrome 세션에 남아 있습니다.

이는 실제 동작 검증이며, 개별 탭의 분류 정확도를 사람이 전수 평가한 결과는 아닙니다.

Chrome 웹 스토어 심사·배포는 진행하지 않았습니다. 자동 테스트는 모든 브라우저 버전이나 사용 중 동시 변경의 모든 조합을 보증하지 않습니다.

## v0.2.0 사용자 카테고리와 제안

- 단위·회귀 테스트 22개와 문법 검사 통과. 사용자 카테고리 저장, 오래된 정리안 거부, 제안 수락 시 탭을 변경하지 않는 동작을 포함합니다.
- 실제 Jev API로 개발 카테고리 하나와 합성 제목 3개를 검증했습니다. 제빵 제목 2개는 기타 확률 1.0, React 제목은 개발 확률 0.99였으며, 추가 판정에서 `Sourdough bread` 후보를 신뢰도 0.91/0.93으로 제안했습니다. 두 요청 보고 비용 합계는 $0.000046242입니다. 실제 API를 사용한 합성 입력 테스트이며 사용자 탭 재그룹화는 아닙니다.
- 사용자 Chrome에서 확장 v0.2.0 로드, 카테고리 편집기와 실제 탭 미리보기를 확인했습니다. 기존 그룹과 되돌리기 기록을 보존했습니다.
- 현재 분류 상한은 500개, 요청당 20개입니다. 후보는 제목의 반복 구절·도메인에서 추출하므로 추상적인 공통 주제를 놓칠 수 있습니다.

## v0.3.0 compact popup and languages

- Frontend designer subagent rebuilt the popup as a fixed 380×560 CSS-pixel surface: only results scroll; apply/undo remain in the footer. Detailed settings use a separate options tab.
- English is the default, with Korean, Japanese, Simplified Chinese, and Spanish. All UI/runtime translation keys and placeholders are checked. Saved category names are not translated or overwritten.
- `npm test`: 25 passing checks. `npm run check`: passed.
- `tests/ui-smoke.mjs`: 10 passing combinations (5 languages × light/dark). An isolated Chromium renders actual UI files with synthetic Chrome API responses, 24 groups, and long titles. It checks horizontal overflow, footer visibility, settings navigation callback, and preserving drafts when changing language. Screenshots are `docs/assets/popup-en.png` and `popup-ko.png`; their data is synthetic.
- The optional visual test uses an installed Playwright package: `PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/ui-smoke.mjs`. Playwright is not an extension dependency.
- Live Chrome extension-manager navigation was blocked by the browser tool URL policy. This version has not been reloaded or validated in the native toolbar popup; reload Tabfold once in Chrome's extension manager to activate the manifest/background update. Existing tabs were not regrouped or closed during this update.

## v0.3.1 category JSON files

- Added JSON import/export on the settings page, using the same category validator as the backend. Import updates the draft only; Save persists it. Exports include only category fields.
- Isolated Chromium verified valid import, malformed/duplicate/non-array/oversized file rejection without replacing the draft, download round-trip equality, and explicit save. All 10 language/theme layout checks and 25 unit/regression checks passed.
- JSON files are not automatically synchronized. The installed Chrome extension still needs a manual reload; no user tabs were changed.

## v0.4.0 TypeSafe direct

- Implemented the official `POST https://api.typesafe.ai/v1/systemone` contract using Bearer authentication and pinned `jev-1.13.0` (https://docs.typesafe.ai/api, https://docs.typesafe.ai/models). OpenRouter remains the default.
- Provider-specific session keys, strict provider allowlist, selected-provider optional host access, and no automatic cross-provider fallback.
- 27 unit/regression checks passed, including routing both classification and suggestion requests to TypeSafe, key isolation, invalid provider rejection, and preview invalidation. These transport tests use synthetic responses.
- No `TYPESAFE_API_KEY` was configured in the supplied environment file, so a successful authenticated TypeSafe live call has not been verified. Native extension reload remains manual.
- Isolated UI tests passed all 10 language/theme combinations, including selecting providers and requesting only the TypeSafe API origin for a TypeSafe preview.

## v0.5.0 tab ordering

- Added current/title/least-recently-used order for tabs inside newly created groups. Uses Chrome `lastAccessed` (Chrome 121+); missing values sort last. Group layout between windows remains unchanged.
- 29 unit/regression tests passed, including numeric title order, timestamp ties/missing values, stale-preview rejection after a setting change, and same-window tab moves with protected tabs untouched using a mock Chrome API. Native toolbar reload and real Chrome sorting remain unverified.
- All 10 isolated UI language/theme combinations passed, including saving the order setting and preserving its selection across language changes.
