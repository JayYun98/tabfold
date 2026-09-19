<p align="center"><img src="docs/assets/cover.svg" alt="Tabfold — Less tab noise. More headspace." width="100%"></p>

<p align="center"><strong>탭을 접고, 생각을 펼치세요.</strong><br>열린 탭을 살펴보고, 주제별로 묶고, 필요할 때 다시 펼치세요.</p>

<p align="center">Chrome Manifest V3 &nbsp; / &nbsp; Jev 1.13 &nbsp; / &nbsp; 설치 의존성 0</p>

---

**Tabfold**는 탭을 많이 열어두는 사람을 위한 작은 Chrome 확장입니다. 로컬 규칙으로 바로 정리하거나, OpenRouter의 **TypeSafe Jev 1.13**으로 탭의 맥락을 분류할 수 있습니다. 정리 결과는 먼저 확인하고 적용합니다.

### 할 수 있는 일

- **정리안 미리보기** — 그룹을 펼쳐 어떤 탭이 들어가는지 확인합니다.
- **주제별 그룹화** — 현재 창 또는 모든 창을 정리합니다. 창 사이로 탭을 이동하지 않습니다.
- **탭 압축** — 그룹을 접어 탭 바를 줄입니다. 탭과 페이지 상태는 유지합니다.
- **중복 정리** — URL이 완전히 같은 탭만 별도 확인 후 닫습니다.
- **되돌리기** — 마지막 Tabfold 그룹화를 해제하거나, 닫은 중복 주소를 다시 엽니다.

고정 탭, 소리를 재생하는 탭, 기존 그룹, 시크릿 탭과 내부 페이지는 정리 대상에서 제외합니다. 활성 탭은 중복 정리로 닫지 않습니다.

### 1분 설치

1. 이 저장소를 내려받습니다.
2. Chrome에서 `chrome://extensions`를 엽니다.
3. **개발자 모드 → 압축해제된 확장 프로그램을 로드**를 선택합니다.
4. 저장소 안의 **`extension` 폴더**를 선택합니다.
5. 툴바에 Tabfold를 고정하고 열어보세요.

빌드나 패키지 설치가 필요 없습니다. 아직 Chrome 웹 스토어 배포 버전은 아닙니다.

### Jev로 정리하기

확장의 **Jev 1.13으로 분류하기**를 열고 OpenRouter API 키를 입력한 뒤, **이번 세션에 저장 → Jev로 정리안 만들기**를 누르세요. 처음 실행할 때 OpenRouter 연결 권한을 요청합니다.

Jev는 문장을 생성하는 채팅 모델이 아니라 선택지를 판정하는 모델입니다. Tabfold는 [OpenRouter Decisions API](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request)를 통해 `typesafe/jev-1.13`을 호출해 정해진 주제로 분류합니다. AI 호출은 버튼을 누를 때만 이루어집니다. 오류가 나면 탭은 변경하지 않으며, 로컬 정리도 계속 사용할 수 있습니다.

API 사용료는 본인의 OpenRouter 계정에 부과됩니다. [현재 모델 가격](https://openrouter.ai/typesafe/jev-1.13)을 확인하세요. 한 번에 최대 100개 탭, 요청당 최대 20개를 분류합니다. 응답 신뢰도가 0.7 미만이면 도메인 분류로 돌립니다. 한국어 제목이나 맥락이 모호한 탭은 오분류될 수 있으므로 미리보기를 확인하세요.

### 데이터와 권한

| 항목 | 처리 방식 |
| --- | --- |
| 로컬 정리 | 외부 전송 없음 |
| AI 정리 | 대상 탭의 제목과 URL의 origin·path를 OpenRouter/TypeSafe로 전송 |
| 전송 제외 | 페이지 본문, URL의 사용자정보·쿼리·해시 |
| API 키 | Chrome 세션 저장소에 보관. 브라우저 종료 시 삭제 |
| 분석·광고 | 없음 |
| `tabs`, `tabGroups` | 탭 조회와 그룹 생성·해제 |
| `storage` | 정리안, 되돌리기 및 중복 URL 복원 기록 |
| OpenRouter 호스트 권한 | AI 실행 시에만 선택적으로 요청 |

제목이나 URL 경로 자체에 민감한 정보가 있을 수 있습니다. AI를 사용하면 제공자의 데이터 정책이 적용됩니다. 자세한 내용은 [개인정보 안내](docs/PRIVACY.md)를 참고하세요.

### 알아두기

그룹 접기는 **시각적인 압축**입니다. 메모리 절감이나 페이지 내용 요약을 의미하지 않습니다. 그룹 되돌리기는 원래 탭 순서를 완전히 복구하지 않으며, 사용자가 이름·색을 바꾼 그룹은 보존합니다. 중복 탭 복원은 주소를 다시 여는 방식이므로 입력 중인 내용·스크롤·로그인 상태를 복원하지 않습니다.

### 개발과 검증

Node.js 22 이상에서 실행합니다.

```sh
npm test
npm run check
```

런타임 라이브러리, 번들러, 원격 코드 없이 표준 Chrome API와 JavaScript로 구성했습니다. 검증 범위와 제한은 [검증 기록](docs/VALIDATION.md), 소개 문구는 [출시 자료](docs/LAUNCH.md)에 있습니다.

### 참고한 프로젝트

[TabPilot](https://github.com/florianlanx/tabpilot)과 [AI Group Tabs](https://github.com/MichaelYuhe/ai-group-tabs)의 사용 흐름을 참고했습니다. 코드는 독자 구현이며 두 프로젝트의 코드·로고·자산을 포함하지 않습니다. 표지 이미지는 기능을 설명하는 일러스트입니다.
