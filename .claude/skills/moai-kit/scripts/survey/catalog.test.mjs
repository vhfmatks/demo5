// node --test .claude/skills/moai-kit/scripts/survey/catalog.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { checkSpec, genArgs, planSteps } from "./catalog.mjs";

const ok = {
  version: 1, name: "my-app", title: "나의 서비스", example: false, choices: { navigation: "sidebar" },
  domains: [
    { entity: "room", label: "회의실", fields: [{ name: "capacity", label: "정원", type: "int", required: true }] },
    { entity: "booking", label: "예약", fields: [
      { name: "roomId", label: "회의실", type: "ref", target: "rooms", required: true },
      { name: "kind", label: "종류", type: "enum", options: [["MEET", "회의"], ["EDU", "교육"]] },
    ] },
  ],
};

test("유효한 spec → gen 인자", () => {
  const { spec, errors } = checkSpec(ok);
  assert.deepEqual(errors, []);
  assert.equal(spec.choices.theme, "light"); // 빠진 선택은 기본값
  assert.deepEqual(genArgs(spec.domains[1]), ["booking", "예약", "--plural=bookings", "--auth=required", "--fields=roomId:ref(rooms)!:회의실,kind:enum(MEET=회의|EDU=교육):종류"]);
});

test("잘못된 spec 은 생성 전에 거부", () => {
  const bad = structuredClone(ok);
  bad.choices.navigation = "hybrid";
  bad.domains[0].entity = "user"; // users 는 키트가 씀
  bad.domains[1].fields[0].target = "bookingz"; // 없는 대상
  bad.domains[1].fields.push({ name: "title", label: "제목", type: "text" }); // 예약 필드
  bad.domains.push({ entity: "note", label: "공지", auth: "public", fields: [{ name: "roomId", label: "x", type: "ref", target: "rooms" }] });
  const { errors } = checkSpec(bad);
  for (const hint of ["주 메뉴", "키트", "참조 대상", "예약 필드", "공개 도메인"]) assert.ok(errors.some((e) => e.includes(hint)), hint);
  assert.ok(checkSpec({ ...ok, example: true, domains: [{ entity: "request", label: "요청", fields: [] }] }).errors.some((e) => e.includes("예제")));
});

test("gen 이 거부할 입력은 설문에서 먼저 거부", () => {
  const bad = structuredClone(ok);
  bad.domains[1].fields[1].options = [["BIG", "대(大)"]]; // gen 의 enum(…) 파싱을 깬다
  bad.domains.push({ entity: "room", plural: "venues", label: "장소", fields: [] }); // 권한 키 room.* 중복
  const { errors } = checkSpec(bad);
  for (const hint of ["선택지", "room 이(가) 중복"]) assert.ok(errors.some((e) => e.includes(hint)), hint);
  const nullOption = { ...ok, domains: [{ entity: "task", label: "업무", fields: [{ name: "kind", label: "종류", type: "enum", options: [null] }] }] };
  assert.ok(checkSpec(nullOption).errors.some((e) => e.includes("선택지"))); // TypeError 가 아니라 검증 오류
});

// kit.mjs survey 와 같은 호출: existing = 기존 feature·경로 중 spec(base) 도메인이 아닌 것 (새 도메인 이름도 그대로 남는다)
test("기존 프로젝트: 있는 이름은 거부·참조는 gen 엔티티만, 계획은 바뀐 것만", () => {
  const spec = { ...ok, domains: [{ entity: "comment", label: "댓글", fields: [] }, { entity: "memo", label: "메모", fields: [{ name: "requestId", label: "요청", type: "ref", target: "requests" }] }] };
  const { spec: checked, errors } = checkSpec(spec, { existing: ["requests", "comments", "login"], refTargets: ["requests"] });
  assert.deepEqual(errors, ["도메인 1: comments 은(는) 이미 있는 도메인입니다."]);
  const toLogin = structuredClone(spec);
  toLogin.domains[1].fields[0].target = "login";
  assert.ok(checkSpec(toLogin, { existing: ["requests", "login"], refTargets: ["requests"] }).errors.some((e) => e.includes("참조 대상")));
  const steps = planSteps(checked, { choices: { navigation: "top", theme: "light" }, plurals: ["comments"] });
  assert.equal(steps.length, 3); // 레이아웃 1 + 기록 + 새 도메인 1 (comments 는 건너뜀)
  assert.ok(steps[0].includes("상단 GNB → ") && steps[2].startsWith("gen memo"));
});
