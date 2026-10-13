---
name: moai-tdd
description: moai 구현의 행동 기반 TDD. 승인된 공개 seam에서 시험 하나 → 실제 RED → 최소 구현 → 실제 GREEN을 반복하고 실행 근거를 기록한다. moai-implementer의 기능·버그 구현, 또는 이 레포에서 TDD로 기능을 구현할 때 사용한다.
argument-hint: "[Issue 번호 또는 구현할 AC]"
---

# moai-tdd

시험 하나는 `docs/e2e-test.md` §2의 TC 행 하나(`TC | REQ | AC | 경계 | GIVEN · WHEN · THEN | 예상 결과 | 자동화 위치`)를 그대로 코드로 옮긴 것이다. 상태는 실행한 결과로만 적는다.

## 1. 승인된 seam

- `Test seam`은 최종 사용자/API 검증 경계, `TDD seam`은 빠른 공개 정책/서비스 함수 또는 같은 API/UI 경계다. Issue 발행 때 확인된 seam은 승인된 것으로 본다.
- `TDD seam`이 없으면 `Test seam`을 쓴다. 둘 다 없거나 seam을 바꿔야 하면 구현자는 `BLOCKED`로 보고한다(직접 호출이면 사용자에게 묻는다). private 함수 시험을 임의로 추가하지 않는다.
- 서비스 시험의 GREEN을 UI·HTTP·Origin 검증 PASS로 확대하지 않는다.

## 2. 한 행동씩 RED → GREEN

1. TC 행 하나를 골라 시험을 먼저 쓴다. 제목은 그 TC ID로 시작하고 기대값은 명세에서 가져온 독립 값이다.
   - **GIVEN**: 합성 계정·데이터. 기존 fixture·`apiAs/pageAs`를 쓴다.
   - **WHEN**: 승인 seam으로 하는 행동 하나.
   - **THEN**: 상태 코드와 함께 응답 본문·오류 `code`·화면 내용. 거부면 상대 자료가 응답·화면에 없음까지 본다.
   - **AND**: 거부·오류 뒤에는 저장값 불변, 성공 뒤에는 저장 유지. 공개 조회(서비스 DTO·GET API·화면)로 다시 읽어 확인하고 DB 직접 조회로 대신하지 않는다.
2. 가장 좁은 명령으로 실행해 **동작 불일치의 RED**를 실제로 본다. 환경·설치·import 오류, 0개 실행, skip, timeout은 RED가 아니다. 아직 없는 인터페이스는 컴파일되는 빈 구현까지만 만든 뒤 assertion 실패를 확인한다.
3. 그 시험을 통과하는 최소 코드를 쓴다. 다음 시험을 내다본 기능·추상화는 넣지 않는다.
4. 같은 명령으로 **GREEN**을 확인하고 관련 회귀를 좁게 본다. 다음 행동으로 넘어간다.
5. 시험을 몰아서 먼저 쓰는 배치 RED, 사후 RED 재구성, 수평 분할은 금지한다.

AC마다 §2 `경계` 칸의 정상·오류·권한·재조회를 실제로 실행한다. 권한이 걸린 AC는 404(볼 권한 없음)·403(행위 불가)·409(상태 불가) 중 해당 경계를 빠뜨리지 않는다. 계획에 필요한 경계가 없으면 `docs/e2e-test.md`를 고치지 않고 보고의 `빠진 경계`에 적는다.

**생성기 결과는 정직하게**: `gen`·kit init이 이미 제공한 행동은 **생성 baseline 검증**이며 TDD라고 하지 않는다. 올바른 생성 코드를 일부러 망가뜨려 RED를 만들지 않는다. 생성 후 추가 규칙은 위 RED → GREEN을 따른다. 최초 init은 `.claude/skills/moai-kit/references/bootstrap.md`.

## 3. 시험 품질·명령

- 단위: `npx vitest run tests/unit/<x>.test.ts -t '<시험 이름>'`. 기존 메모리 DB·fixture를 재사용한다.
- API/UI가 유일한 seam이면 `node .claude/skills/moai-kit/scripts/kit.mjs e2e tests/e2e/<x>.api.spec.ts`로 RED/GREEN을 실행한다. 격리 runner만 쓰고 기존 서버 재사용·직접 Playwright 실행은 금지한다.
- 금지: 소유 모듈·내부 collaborator mock, private 함수 시험, 호출 횟수/순서 assertion, DB 직접 조회로 결과 확인, 구현과 같은 계산으로 기대값 만들기, 앱 E2E의 route/HTTP mock, 고정 sleep·only·skip·retries.
- 외부 서비스·시간·무작위성은 시스템 경계에서만 대체한다.
- 빠른 seam으로 충분한 행동의 E2E는 통합 게이트로 미룰 수 있다. 이때 상태는 `미실행(통합 게이트 예정)`이다. E2E로만 관찰할 수 있는 행동과 인증·권한·마이그레이션 위험은 관련 E2E를 미리 실행한다.

## 4. 보고 계약

TC마다 한 줄. 상태는 직접 실행한 뒤에만 적는다.

```text
TC-<DOMAIN>-API|UI-NNN (AC-xx-k · seam · 시험 파일) 경계 <정상|오류|권한|재조회> · RED <명령 → 실패 이유> · GREEN <명령 → 통과 수> · PASS | FAIL | 미실행(통합 게이트 예정)
baseline: <생성/기존 행동의 시험과 실제 결과, 또는 없음>
빠진 경계: <AC별로 계획에 없는 경계, 또는 없음>
```

상태 코드만 본 THEN, AND(저장값 불변·유지)를 확인하지 않은 거부/성공 시험은 PASS가 아니다. 시험을 작성만 한 것을 TDD PASS로 보고하지 않는다. 근거 부족·seam 변경·환경 장애는 원인을 적어 `BLOCKED`로 보고한다.
