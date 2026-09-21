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

## v0.6.0 multilingual documentation and interface

- Replaced the English README with the supplied optimized structure. Added French, Korean, Simplified Chinese, Traditional Chinese, Russian, Japanese, Turkish, and Spanish README translations, each with navigation to all nine languages. Verified every local document and image link. The old Korean document links to its new location.
- Added French, Traditional Chinese, Russian, and Turkish UI dictionaries and Chrome manifest messages. English remains the default; existing Spanish support is preserved.
- All 29 unit/regression checks and JavaScript syntax checks passed. Translation checks cover required UI/runtime keys, interpolation placeholders, and native manifest messages for every language.
- All 18 isolated Chromium language/theme combinations passed: 380×560 popup bounds, visible apply footer, settings overflow, language selection, and draft preservation. These checks use synthetic Chrome responses, not the user's tabs. Native toolbar reload remains manual; no live AI calls or user-tab changes were made.

## v0.7.0 existing groups as classification context

- Preview now reads native group names, colors, members, and window identity before any AI request. Popup lists existing groups separately from new-group/append proposals, and explains grouped versus other excluded tabs.
- Quick preview uses an unambiguous same-window hostname match. AI prioritizes existing same-window groups with up to three sanitized member examples, then configured categories. Matching ungrouped tabs append; existing group members and metadata are preserved. Changed target metadata or membership invalidates apply.
- 34 unit/regression checks and syntax checks passed, including window isolation, duplicate group names, context URL sanitization, append ordering, stale-target rejection, and undo preserving original members. All 18 language/theme UI checks passed with synthetic data.
- `tests/native-groups.mjs` passed in a temporary, isolated Chromium profile with the real extension loaded: native group append, unchanged title/color/collapsed state, original member order, and undo removing only the added tab. Run with `PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/native-groups.mjs`. No user browser connection or AI calls are made by this test.
- The user's installed extension still requires reload. No user tabs were changed and no live AI classification calls were made for this update.

## v0.8.0 regroup mode and local NLP

- Settings now offer preserve (default) or regroup. The saved mode is authoritative and changing it invalidates previews. Regroup ignores original group context and includes safe grouped tabs; only proposed clusters of at least two tabs move. Unmatched singletons remain in place. The popup explicitly identifies regroup mode before Apply.
- Quick preview uses corpus-fitted TF-IDF word/character features and cosine/centroid clustering, isolated by window. This is lexical NLP, not a pretrained semantic neural model; no TensorFlow.js, model download, external requests, or runtime dependency. `extension/clustering.js` is an ES module usable in browsers or Node. Its source is about 4.5 KB (about 1.9 KB gzip). A synthetic 500-tab, four-window run on this Mac took about 20 ms; this is a single local measurement, not a production latency or accuracy guarantee.
- 41 unit/regression checks and JavaScript syntax checks passed. All 18 isolated language/theme UI checks passed, including mode selection, regroup warning, and protected counts.
- Native isolated Chromium passed preserve/append and regroup/undo scenarios: existing protected members remain in place, emptied original groups disappear and are recreated on undo with their metadata, and originally ungrouped tabs return to ungrouped. Test pages are served as synthetic documents and awaited until loaded so pending navigation cannot race the preview.
- Undo does not guarantee exact original tab order and skips later user edits, changed URLs, or moved tabs. No user Chrome tabs or live AI requests were used for this release. Reload the installed extension to activate v0.8.0.

## v0.8.1 popup grouping mode

- Added the existing preserve/regroup selector directly above Apply in the popup, sharing the saved setting with the options page. Changing it invalidates the old plan and automatically refreshes local preview without an AI request or tab mutation. Regroup retains its warning; preserve hides the redundant notice.
- All 41 tests, syntax checks, and 18 language/theme UI checks passed. UI checks now operate the actual popup selector in both directions and verify saved mode, automatic local preview, warning visibility, and footer bounds.

## v0.9.0 popup checkboxes

- Popup exposes All windows, Regroup existing groups, Ignore saved categories, and Suggest new categories in a compact checkbox grid; Collapse groups remains a checkbox. Regroup and AI preferences persist independently. Scope and collapse remain popup-local selections.
- Ignoring categories preserves their stored definitions and omits their AI choices; existing Chrome-group context remains unless regroup is enabled. With no category choices, the initial Other-only API call is skipped: optional local-topic candidates can still be validated, otherwise hostname fallback is used.
- Preference changes merge validated booleans through the backend and invalidate previews. Options-page saves preserve unrelated preferences. Checkbox changes refresh local preview without calling AI or applying groups. Failed saves restore the checkbox; failed refreshes disable Apply rather than retain a stale plan.
- All 44 unit/regression checks, syntax checks, 18 language/theme UI combinations, and isolated native Chromium append/regroup/undo scenarios passed. UI failure checks cover rejected saves and failed preview refresh. No user tabs or live AI requests were used.

## v0.9.1 topic grouping instead of domain fallback

- Quick preview, AI Other/low-confidence fallback, ignored-category preview, and suggestion candidates now share the local topic clusterer. Removed hostname-only existing-group matching and the obsolete domain/website keyword classifier. Jev instructions explicitly prioritize topics/projects over websites.
- Local features remove common site/search boilerplate, retain shared descriptive phrases, and recognize exact GitHub owner/repository identities. Same owner alone is not a project match. Processing order is deterministic; windows remain isolated and weakly related singletons are not forcibly grouped.
- Read actual Chrome titles/groups without modifying tabs. A local eight-tab public research/development sample, replayed as one window because the browser inventory did not expose window IDs, previously yielded eight singleton clusters. It now yields five speculative-decoding tabs in one cluster and three repository/PR/issue tabs in an OpenCodex cluster. This selected sample is not an overall accuracy metric or an actual multi-window regroup. Full browsing inventory and query strings were not committed or sent to an AI provider.
- This remains lexical NLP: synonyms and translations with no shared terms may remain separate. No model dependency or paid AI request was added. Reload the unpacked extension; enable Regroup existing groups to rebuild already-grouped tabs.
- Verification: all 47 unit/regression tests, syntax checks, 18 language/theme UI combinations, and native isolated Chromium preserve/append plus regroup/undo checks passed. Existing safety tests retain their assertions; domain-only placeholder fixtures were given shared topic titles.

## v0.10.0 existing-group purpose research

- Compared parent lexical assignment, category-name-only prototypes, purpose-aware local assignment, and a bounded live Jev run. Detailed provenance and redacted attempt logs: [beam notes](beam_notes.md). Observed257tabs;245HTTP(S) tabs across6windows entered classification evaluation. Browser inventory did not expose pinned/audio state, so this dataset was not used for actual mutations.
- Local purpose rules recognize clear broad media/jobs intent; exact project examples remain useful for project groups. Up to6 diverse sanitized examples replace first-three sampling. Other/low-confidence fallback retains group context. Same-window preservation uses existing group IDs; names from other windows are templates for separate local groups, never cross-window moves.
- Regroup now rebuilds membership while reusing meaningful names; raw hostname/IP labels are excluded as regroup templates. `Use existing group names` defaults on and can be disabled independently in the popup to restore a full reset. Turning it off suppresses group metadata/examples for AI. Saved-category ignoring remains separate.
- Final focused live check on28observedtabs:YouTube9/9→Media/SNS, LinkedIn job-listing proxy11/11→JobRecruit, repository8/8→OpenCodex. Total20requests cost$0.025413528. Full245-tab live run used16requests; final245-tab integrated evaluation replays those responses with improved local routing. Existing-name coverage183/245 is not an accuracy claim. Raw browsing data and review HTML stay in ignored `.private/research/`.
- All56unit/regression tests,18language/theme UI checks, and3native isolated Chromium scenarios passed (append/undo, regroup/restore protected originals, same-window media append plus other-window name reuse and undo). Full Chrome user groups were not changed. Reload the unpacked extension to activate this version.
- Final suggestion guard: tabs that local fallback successfully assigns to an existing group/template are excluded from new-category suggestions. This avoids proposing redundant groups after a Jev Other decision. All57unit/regression tests pass after this guard; live measurements above used suggestions disabled and are unchanged.

## v0.10.1 explicit preferred groups

- URL-bound user preferences run before Quick/AI topic inference: actual Toss Invest hosts→Investment; Google.com/Google.co.kr `/search`→Google search. Google Docs/Mail/Gemini, lookalike hosts, and page-title-only matches are excluded. Google links wrapping another URL remain search tabs. These explicit policies are independent of saved-AI-category and existing-name toggles.
- Six supplied examples and all20matching tabs in the previous245-tab snapshot pass (18search,2investment), with0off-target preferred assignments. Snapshot preview includes all20tabs in6window-local groups; same names in different windows are intentionally separate. User Chrome was not changed; protected eligibility is still enforced during real preview/apply.
- Review→optimization ran3rounds. Fixed duplicate same-name groups caused by AI/local identity or color differences,1+1singleton loss, and unwanted third groups when multiple physical targets shared a name. Ambiguous preserve-mode targets now abstain. Explicit physical group IDs remain separate.
- All69unit/regression tests pass. No new live API request or cost. Full review artifact remains private/ignored. Global245-tab grouping accuracy is not established by the20targeted checks.
- Native isolated Chromium: all4scenarios passed, including2Google+2Toss tabs forming exactly2preferred groups, a pinned Google tab staying protected, and apply/undo preserving windows. Test-only page routing was adjusted to attach before navigating new pages after an initial interception race; no user browser was connected.

## v0.10.2 image-file grouping

- Image extensions in the decoded URL pathname classify as Images before lexical/AI routing. Supports common formats case-insensitively; URL query/fragment and title-only mentions do not trigger the rule. Existing-window target/ambiguity/protected policies are shared with preferred rules.
- The supplied opaque PNG filename now has Images as its candidate; the private snapshot review was updated locally. New groups still require2tabs, while a unique existing Images group accepts1. No actual browser tabs were moved.
- All70unit/regression tests and syntax checks pass, including Quick/AI parity with zero image API requests, encoded uppercase extension, misleading query/HTML suffix, and existing group append identity.
