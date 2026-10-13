# `gen --fields` 명세

값은 항상 작은따옴표로 감싼다. `name:type[!]:라벨`을 쉼표로 잇고, `!`는 필수 표시다. `title`(필수)과 `memo`는 지정하지 않아도 항상 생성된다.

| type | DB | 입력·표시 | 비고 |
|---|---|---|---|
| `text` | text ≤200 | Input | |
| `long` | text ≤2000 | Textarea | 목록 열 제외 |
| `int` | integer 0~10억 | number | 선택 입력의 빈 값 = 0 |
| `num` | real ±10억 (음수·소수) | number(step=any) | 금액 증감·실적·점수. 선택 입력의 빈 값 = 0 |
| `bool` | integer(boolean) | Checkbox | `!` 무시, 기본 false |
| `date` | text `YYYY-MM-DD` | KDS DatePicker, 표시 `YYYY.MM.DD` | FormData는 ISO, 선택 입력의 빈 값 = "" |
| `datetime` | text `YYYY-MM-DDTHH:mm` (KST) | datetime-local | 문자열 비교로 정렬·겹침 검사. 선택 입력의 빈 값 = "" |
| `enum(A=라벨\|B=라벨)` | text enum | Select | `<ENTITY>_<FIELD>_VALUES`·`_LABEL` 상수 생성, 선택 입력의 기본값 = 첫 값 |
| `ref(<대상 복수형>)` | text FK + index | Select(선택지) | 아래 "ref" 참고 |

- 예약어(사용 불가): `id title memo owner ownerId version createdAt updatedAt`
- 한 번의 명세로 테이블 컬럼, zod(생성 기본값·수정 partial), DTO, toDto, 폼, 목록 열, 상세 항목, API 시험 SAMPLE, UI 시험 입력까지 함께 들어간다.
- 시간 범위(시작~종료 겹침)는 `datetime` 두 개로 만든 뒤 [scenarios.md](scenarios.md)의 "시간 범위·겹침" 행을 따라 service 에 규칙을 넣는다.

## ref (다른 엔티티 참조)

`roomId:ref(rooms)!:회의실` · `counselorId:ref(users)!:상담사` · `parentId:ref(nodes):상위`

- 이름은 `...Id`로 끝난다. 대상은 **먼저 gen 으로 만든 엔티티** 또는 `users`. `--auth=public` 에서는 쓸 수 없다.
- 생성되는 것: FK(필수 = 대상 삭제 시 함께 삭제 cascade, 선택 = 비움 set null) · index · 존재하지 않는 대상 400(`fieldErrors.<name>`) · DTO 표시값 `<stem>Label`(대상 `title`, users 는 `name`) · 폼 Select 선택지(`get<Entity>Options`, 대상 service 목록 권한, 최대 100건) · 시험(대상 행 자동 생성, `TC-<X>-API-005` 잘못된 참조 거부).
- 자기 참조(트리·분기)는 선택(`!` 없음)만 가능하다.
- 저장 시 대상 열람 권한을 대상 service 의 `get<X>(actor, id)`로 확인한다(볼 수 없는 행 = 없음과 같은 400, TC-<X>-API-007). `ref(users)`는 존재만 확인한다.
- `ref(users)` 선택지는 전체 사용자다. 역할로 좁히려면 service `get<Entity>Options` 에서 `userOptions(["APPROVER"])`.
- 대상 열람 권한까지 검사하려면 생성된 `checkRefs` 를 대상 service 의 `get<X>(actor, id)` 호출로 바꾼다(기본은 존재만 확인).

```bash
K gen expense 경비 '--fields=amount:int!:금액,spentOn:date!:사용일,category:enum(MEAL=식대|TRAVEL=교통)!:분류,receipt:bool:영수증,note:long:비고'
K gen notice 공지 --auth=public '--fields=kind:enum(INFO=안내|WARN=경고)!:종류'
K gen slot 상담시간 '--fields=counselorId:ref(users)!:상담사,startAt:datetime!:시작,endAt:datetime!:종료,capacity:int!:정원'
K gen seat 상담신청 '--fields=slotId:ref(slots)!:상담시간,reason:long!:상담 사유'
```
