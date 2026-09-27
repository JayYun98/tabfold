# Tabfold 광고 영상용 스크린샷

[갤러리](index.html) · PNG 원본 12장 · 2× 해상도 · 영어 UI

촬영 기준은 `b3f3eb5` 기반의 **커밋되지 않은 작업 트리**입니다. 실제 확장 프로그램 UI, 서비스 워커 및 Chrome 탭 그룹 API를 사용했습니다. 별도 임시 Chrome 프로필에서 가상의 Research / Design / Travel 페이지를 열었으며, 사용자의 실제 탭·제목·계정은 사용하지 않았습니다. 제품 소스나 화면 문구를 촬영용으로 수정하지 않았습니다.

| 순서 | 파일 | 영상에서 보여줄 내용 |
|---|---|---|
| 01 | [Quick preview](01-quick-preview.png) | API 키 없이 로컬 미리보기, 9개 예시 탭을 3개 그룹으로 제안 |
| 02 | [Review members](02-review-group-members.png) | 그룹을 펼쳐 적용할 탭을 먼저 확인 |
| 03 | [Applied groups](03-applied-groups.png) | 실제 그룹 적용 성공, 기존 그룹 목록과 되돌리기 버튼 |
| 04 | [Undo](04-undo-grouping.png) | 9개 탭을 원래 그룹 상태로 복원한 결과 |
| 05 | [Regroup](05-regroup-preview.png) | 기존 그룹을 다시 묶는 모드와 안내 문구 |
| 06 | [All windows](06-all-windows.png) | 두 창의 탭을 원래 창 안에서 정리하는 미리보기 |
| 07 | [Duplicates](07-review-duplicates.png) | 중복 주소를 검토하고 명시적으로 닫는 흐름, 미저장 편집 손실 안내 |
| 08 | [Language and sorting](08-settings-language-sorting.png) | 언어, 기존 그룹 보존, 최근 사용 시점 기준 정렬 설정 |
| 09 | [OpenRouter](09-openrouter-privacy.png) | 선택형 AI 연결, 빈 API 키 입력란, 전송 정보와 세션 저장 안내 |
| 10 | [TypeSafe](10-typesafe-privacy.png) | TypeSafe 공급자 선택 및 개인정보 안내 |
| 11 | [Category import](11-categories-json-import.png) | 예시 카테고리 3개를 JSON으로 가져온 편집 양식 |
| 12 | [Categories saved](12-categories-saved.png) | 카테고리 저장 확인 및 JSON 내보내기/가져오기 기능 |

## 확인한 동작

- Apply로 실제 Chrome 그룹 생성 후 Undo로 원래 그룹 상태 복원. 탭의 창은 유지됨.
- 중복 예시 탭 1개 닫기 후 URL 복원.
- 카테고리 JSON 초안 가져오기, 명시적 저장, 동일 내용 내보내기.
- 모든 화면을 시각적으로 검사했으며 브라우저 페이지 오류 없음.

실제 AI 미리보기·분류 결과·새 카테고리 제안은 **촬영하지 않았습니다**. API 키를 넣지 않았고 유료 AI 호출도 하지 않았습니다. 로컬 미리보기를 AI 성능 근거로 표현하지 마세요. 생성된 그룹은 가상의 예시 제목에 대한 실제 로컬 결과입니다. 브라우저 툴바 전체가 아닌 확장 프로그램 페이지 영역을 촬영했으며, 실제 네이티브 그룹 상태는 캡처 과정의 검사로 확인했습니다.

[실행 확인 기록](capture-evidence.json) · [재촬영 스크립트](../../../tests/promo-screenshots.mjs)

재촬영: 프로젝트 루트에서 `PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/promo-screenshots.mjs`. 기존 설치된 Playwright와 Chrome for Testing을 사용하고 임시 프로필은 종료 시 삭제합니다.
