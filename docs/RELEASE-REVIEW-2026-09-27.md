# Tabfold — 배포 전 최종 리뷰

2026-09-27 · `codex/tax-doc-classifier-optimization` · HEAD `b3f3eb5` + 현재 미커밋 작업 트리

**최초 리뷰: prod 공유 보류. 아래는 수정 전 발견 사항이다.** 후속 수정으로 4건을 해결했다. 시크릿 창 그룹을 맥락에서 제외하고, 대문자 스킴을 정제하며, 그룹 생성 직후와 메타데이터 갱신 후 상태를 각각 저장해 실패 시 Undo를 지원한다. 팝업도 실패 후 복구 상태를 새로 읽는다. README에서 제거된 고정 분류 약속을 삭제했다. 회귀 테스트는 수정 전 실패, 수정 후 98개 전체 통과를 확인했다. AI 의미적 품질 제한은 여전히 별도 항목이다.

## 확인된 문제

1. **P1 — 시크릿 그룹 이름 전송 가능** (`extension/background.js:65`, `extension/ai.js:82`). 시크릿에서 확장을 허용한 환경에서 모든 창의 그룹을 수집하고 일반 창의 AI 분류 맥락으로 사용한다. 시크릿 탭 예시는 제거하지만 그룹 이름은 남는다. 독립 리뷰 에이전트가 합성 Chrome 응답으로 backend.preview → 요청 본문까지 재현했다. 상위 리뷰에서도 그룹 템플릿에 이름이 남음을 확인했다. 로컬 재현: `node .private/release-review/incognito-repro.mjs` (`privateGroupSent: true`, `privateTabSent: false`). 실제 시크릿 Chrome 환경 검증은 하지 않았다. 그룹 맥락을 만들기 전에 시크릿 창/그룹 전체를 제외해야 한다.
2. **P2 — 대문자 URL 스킴의 인증정보 정제 실패** (`extension/group-context.js:4`). `HTTPS://user:PASSWORD_SENT@example.test/page?token=TOKEN`의 정제 결과가 `https//user:PASSWORD_SENT@example.test/page`로 남는다. 독립 리뷰는 classifyTabs의 합성 전송 본문까지, 상위 리뷰는 공유 정제 함수 출력까지 확인했다. URL 스킴 검사를 대소문자 무관하게 처리하고 동일 입력을 회귀 검증해야 한다. 예시 문자열은 모두 가짜 값이다.
3. **P2 — 그룹 생성 후 메타데이터 설정 실패 시 Undo 불가** (`extension/background.js:281–284`, `extension/background.js:307–321`). tabs.group 성공 후 tabGroups.update에 오류를 주입했다. Apply는 실패하지만 두 탭은 그룹에 남고, Undo는 0개 복원 성공으로 응답하며 복구 기록을 삭제한다. 저장한 기대 이름/색상과 실제 미설정 그룹이 달라 사용자 수정으로 오인한다. 로컬 재현: `node .private/release-review/recovery-repro.mjs`. 정상 API 성공 경로 문제가 아니라 부분 실패 복구 문제다. 생성 직후 상태와 메타데이터 변경 완료 상태를 구분해야 한다.
4. **P2 — README의 고정 분류 약속이 현재 구현과 다름** (`README.md:112`, `README.md:116`). Google Search/Toss/채용을 고정 분류한다고 설명하지만 현재 preferred-groups.js는 이미지 확장자만 고정 분류한다. 배포 문서와 광고는 현재 동작에 맞춰야 한다.

## 분류 품질에 따른 배포 제한

기존 `docs/VALIDATION.md`의 실제 current-product 재실행은 154개 배정 중 117개 정답, 29개 오분류, 8개 애매한 사례를 기록했다(판정 가능한 배정의 정밀도 80.14%). 이번에는 API를 새로 호출하지 않았으며 이를 최신 실측으로 표현하지 않는다. 기존 기록 자체가 안정적인 품질의 배포 승인을 거부한다. 위 코드 문제를 수정해도 별도 독립 데이터의 의미적 품질 검증이 필요하다. UI 화면과 정상 동작 테스트는 정확도의 증거가 아니다.

## 이번에 실행한 검사

- 단위/회귀 95개 통과, 실패·건너뜀 0개.
- 프로젝트 JavaScript 문법 검사 및 diff 공백 검사 통과.
- 실제 UI 파일 + 합성 Chrome 응답: 9개 언어 × 밝음/어두움 18개 조합 통과. 다중 창, 설정, JSON 왕복, 오류 상태 및 화면 넘침 검사 포함.
- 임시 격리 Chromium + 실제 확장 worker/탭 API: 기존 그룹 추가, 재그룹화, 창별 그룹 유지, 이미지/제목 그룹 및 팝업 Apply/Undo 5개 시나리오 통과.
- 개인정보 경계 2건과 부분 실패 복구 1건은 위 조건에서 합성 재현됨. 실제 사용자 탭은 변경하지 않았다.

## 검증하지 않은 것

설치된 사용자 Chrome의 실제 툴바 팝업, 인증된 TypeSafe 실호출, 디버거 없는 장시간 MV3 AI 실행, Chrome Web Store 심사는 이번 검증 범위 밖이다. 배포·업로드·커밋은 하지 않았다. API 키나 실제 사용자 탭 정보는 광고 자료에 사용하지 않는다.

광고용 캡처와 촬영 조건은 `assets/promo/`의 목록을 참고한다. 데모 화면을 실제 유료 AI 결과나 정확도 보증으로 표현하지 않는다.
