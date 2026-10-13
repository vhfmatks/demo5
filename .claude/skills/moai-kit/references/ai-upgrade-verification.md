# AI 호출 보강·안전한 수행계획 예제 검증

기준일: 2026-10-12. 키트 공통 AI 기능과 `init --example` 요청 예제의 검증이다. 현재 해커톤 앱 요청 도메인의 AX 기능 검증이나 기업 운영 준비 완료 판정이 아니다. 실제 외부 모델·사내 Gateway·기업 데이터는 사용하지 않았다. 공식 보안 정책 원본 부재로 SEC-KIT은 임시 통제다.

## 구현 범위

- `aiComplete`: timeoutMs 1000~60000(기본 60000), maxTokens 1~4096(기본 1024), prompt+system 16000자 검증. `meta`에 서버 UUID callId·공급자/실제 모델 ID·사용량 추가.
- `aiJson`: 출력 파싱/스키마 검증까지 반영해 최종 감사 1건. 실패 시간·분류·null 사용량 기록, 원문·키는 감사 제외. 호출 전 실패와 감사 장애는 기존 오류 계약 유지.
- Gateway: 기존 공급자 종류/baseUrl 재사용. 가짜 공급자로 prefix·인증·모델 목록·호출 검증. 실제 Gateway 연결은 미검증.
- 요청 예제: executionPlan/version 추가, 생성 전후 권한·상태·version 검사, 무저장 미리보기, 명시 반영·수정·저장, 조건부 UPDATE+감사 동일 tx, AI 장애 시 수동 입력.
- 예제 mock 덮어쓰기 제거, 관리자 등록 helper 분리. 마이그레이션 `0004_request_execution_plan.sql`은 격리 예제 후보에서 drizzle-kit으로 생성했다.

## 실제 실행 결과

| 범위 | 결과 | 설명 |
|---|---|---|
| 기본 후보 `npm run verify` | PASS | lint·타입·단위 49건·빌드·audit 0 vulnerabilities |
| 후속 AI 단위 시험 | PASS 18 | null 사용량·JSON 파싱 실패·감사 실패·키 복호화 실패 시험 추가 후 좁게 재실행 |
| 기본 후보 전체 격리 E2E | PASS 34 / FAIL·SKIP·FLAKY 0 | 실행 ID 아래 참조 |
| 예제 수행계획 단위 시험 | PASS 13 | 권한·무저장·도중 변경·version·저장 경합·감사 롤백 |
| 예제 후보 `npm run verify` | PASS | lint·타입·단위 96건·빌드·audit 0 vulnerabilities |
| 요청 API 좁은 격리 E2E | PASS 15 | 기존 요청과 신규 계획 API |
| 요청 UI 좁은 격리 E2E | PASS 12 | 미리보기·명시 반영·수동 fallback·늦은 응답·360/375/1280 |
| 예제 후보 전체 격리 E2E | PASS 84 / FAIL·SKIP·FLAKY 0 | 기존 예약·공개 메모·요청 포함 |
| 새 `init` / `init --example` | 생성 성공 | 프로젝트 이름/제목·근거 문서·빌드 산출물·migration meta를 제외한 파일 비교 각각 431/522개 일치. base에 요청 예제 없음, example에 계획 API 있음 |

각 판의 verify는 1회 실행했다. 기본 verify 이후 추가된 것은 좁게 재검증한 시험 및 감사 범위 주석이다. 예제 verify 이후 UI 시험의 정리 구문(release)을 보강했고 해당 최종 시험 소스로 전체 E2E를 실행했다. 새 생성물 자체에서 의존성을 다시 설치하고 전체 시험을 반복하지는 않았다. 격리 후보와 생성물의 코드 일치 확인으로 포장/overlay를 검증했다.

## E2E 실행 식별

후보 프로젝트는 Git 저장소 밖에서 생성되었으므로 Git SHA는 없다. 현재 저장소 SHA를 시험 SHA로 대신 기재하지 않는다.

- 기본 전체: `20261012051200828-28d649eb-3321-4223-896d-daeff7d8832a`
  - 소스 SHA-256: `27dc1c6e28056b5758ed4cd5e64d4df6f480fc22085108eb6d51389fb17f3cd0`
  - 실행 중 소스 변경 false.
- 예제 전체: `20261012051835572-d009079a-fd83-4475-9141-3fe838afc8dd`
  - 소스 SHA-256: `ba37c72514afe1526d125ef99b6184e907c485185b9016c2321caa1d5d67ef2d`
  - 실행 중 소스 변경 false.

원본 runner의 manifest·보고서·trace는 이 세션 임시 후보의 `test-results/runs/<실행 ID>/`, 요약은 후보 `docs/evidence/<실행 ID>.md`에 생성되었다. 임시 경로는 영구 증적이 아니며 세션 작업 삭제 시 사라질 수 있다. 배포 scaffold에 실행 결과/DB/node_modules를 포함하지 않았다.

## 한계와 제외

- 실제 공급자 정확도·비용·모델 상한 준수·Gateway 네트워크/인증서·부하 시험은 미검증.
- 요청 예제의 정책은 현재 앱과 다르다. 기존 앱에 예제 전체를 덮어쓰지 않는다.
- 호출 제한은 프로세스 메모리다. 다중 서버 공유 한도·조직 예산·SSO·tenant·RAG·작업큐·자율 실행·sandbox는 이번 범위 밖이다.
- API가 실패하기 전에 수행된 외부 호출은 취소/롤백할 수 없다. 감사 저장 실패는 성공 응답으로 처리하지 않는다.

사용 규칙과 설정은 프로젝트 `docs/conventions/ai.md`, 패키지 갱신은 [maintenance](maintenance.md)를 따른다.
