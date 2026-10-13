// 서비스 계층 검증 (메모리 DB) — 저장·재조회·권한 경계·상태 전이·감사로그
import { describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { auditLogs } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";
import * as svc from "@/features/requests/service";
import { CreateRequestInput, TransitionInput } from "@/features/requests/schema";
import { RequestErrors } from "@/features/requests/errors";
import { makeUser } from "./fixtures";

const input = (title = "노트북 교체") => CreateRequestInput.parse({ title, category: "EQUIPMENT" });
const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    return e instanceof AppError ? e.code : String(e);
  }
};

describe("requests service", () => {
  it("생성 후 재조회 시 같은 값", async () => {
    const u = await makeUser();
    const r = await svc.createRequest(u, input());
    const again = await svc.getRequest(u, r.id);
    expect(again).toMatchObject({ title: "노트북 교체", status: "PENDING", requester: { id: u.id } });
  });

  it("타인은 조회·수정·삭제 모두 REQUEST_NOT_FOUND, 값 불변", async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    const r = await svc.createRequest(a, input("원본"));
    expect(await code(svc.getRequest(b, r.id))).toBe(RequestErrors.REQUEST_NOT_FOUND.code);
    expect(await code(svc.updateRequest(b, r.id, { title: "탈취" }))).toBe(RequestErrors.REQUEST_NOT_FOUND.code);
    expect(await code(svc.deleteRequest(b, r.id))).toBe(RequestErrors.REQUEST_NOT_FOUND.code);
    expect((await svc.getRequest(a, r.id)).title).toBe("원본");
  });

  it("목록: 일반 사용자는 본인 것만, 승인자는 전체", async () => {
    const [a, b, ap] = await Promise.all([makeUser(), makeUser(), makeUser("APPROVER")]);
    await svc.createRequest(a, input("A건"));
    await svc.createRequest(b, input("B건"));
    const mine = await svc.listRequests(a, { page: 1, pageSize: 100 });
    expect(mine.items.every((x) => x.requester.id === a.id)).toBe(true);
    const all = await svc.listRequests(ap, { page: 1, pageSize: 100 });
    expect(all.items.some((x) => x.requester.id === b.id)).toBe(true);
  });

  it("승인 → 재처리 시 REQUEST_TRANSITION_NOT_ALLOWED, 감사로그 기록", async () => {
    const [u, ap] = await Promise.all([makeUser(), makeUser("APPROVER")]);
    const r = await svc.createRequest(u, input());
    const done = await svc.transitionRequest(ap, r.id, TransitionInput.parse({ action: "approve" }));
    expect(done.status).toBe("APPROVED");
    expect(done.approver?.id).toBe(ap.id);
    expect(await code(svc.transitionRequest(ap, r.id, TransitionInput.parse({ action: "reject", note: "늦음" })))).toBe(RequestErrors.REQUEST_TRANSITION_NOT_ALLOWED.code);
    expect(await code(svc.transitionRequest(u, r.id, TransitionInput.parse({ action: "cancel" })))).toBe(RequestErrors.REQUEST_TRANSITION_NOT_ALLOWED.code);
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, r.id)).all();
    expect(logs.map((l) => l.action)).toEqual(["request.create", "request.approve"]);
  });

  it("요청자는 승인 불가(FORBIDDEN), 승인자는 본인 요청 승인 불가", async () => {
    const [u, ap] = await Promise.all([makeUser(), makeUser("APPROVER")]);
    const r = await svc.createRequest(u, input());
    expect(await code(svc.transitionRequest(u, r.id, { action: "approve" }))).toBe(RequestErrors.REQUEST_TRANSITION_FORBIDDEN.code);
    const own = await svc.createRequest(ap, input());
    expect(await code(svc.transitionRequest(ap, own.id, { action: "approve" }))).toBe(RequestErrors.REQUEST_SELF_DECISION_FORBIDDEN.code);
  });

  it("보기: mine=본인 요청, inbox=타인의 대기 요청만(일반 사용자는 항상 빈 목록)", async () => {
    const [u, ap] = await Promise.all([makeUser(), makeUser("APPROVER")]);
    const pending = await svc.createRequest(u, input("대기건"));
    const decided = await svc.createRequest(u, input("처리건"));
    await svc.transitionRequest(ap, decided.id, TransitionInput.parse({ action: "approve" }));
    const own = await svc.createRequest(ap, input("승인자 본인건"));
    const inbox = (await svc.listRequests(ap, { view: "inbox", page: 1, pageSize: 100 })).items.map((x) => x.id);
    expect(inbox).toContain(pending.id);
    expect(inbox).not.toContain(decided.id);
    expect(inbox).not.toContain(own.id);
    expect((await svc.listRequests(ap, { view: "mine", page: 1, pageSize: 100 })).items.map((x) => x.id)).toEqual([own.id]);
    expect((await svc.listRequests(u, { view: "inbox", page: 1, pageSize: 100 })).items).toHaveLength(0);
  });

  it("처리 이력: 등록→승인 순서·의견 포함, 볼 수 없는 사람은 REQUEST_NOT_FOUND", async () => {
    const [u, other, ap] = await Promise.all([makeUser(), makeUser(), makeUser("APPROVER")]);
    const r = await svc.createRequest(u, input());
    await svc.transitionRequest(ap, r.id, TransitionInput.parse({ action: "approve", note: "확인함" }));
    const history = await svc.getRequestHistory(u, r.id);
    expect(history.map((h) => [h.action, h.actor?.id])).toEqual([["create", u.id], ["approve", ap.id]]);
    expect(history[1].detail).toMatchObject({ from: "PENDING", to: "APPROVED", note: "확인함" });
    expect(await code(svc.getRequestHistory(other, r.id))).toBe(RequestErrors.REQUEST_NOT_FOUND.code);
  });

  it("입력 검증: 반려는 사유 필수, 제목 길이", () => {
    expect(TransitionInput.safeParse({ action: "reject" }).success).toBe(false);
    expect(CreateRequestInput.safeParse({ title: "a", category: "EQUIPMENT" }).success).toBe(false);
    expect(CreateRequestInput.safeParse({ title: "정상 제목", category: "NOPE" }).success).toBe(false);
  });
});

// 쓰기와 감사로그는 같은 트랜잭션: audit insert 가 DB 에서 실패하면 업무 변경도 롤백된다 (docs/conventions/data.md)
describe("requests service — audit 실패 시 롤백", () => {
  /** 해당 actor 의 감사로그 insert 를 SQLite trigger 로 실패시킨다 (mock 없이 실제 트랜잭션 의미 검증) */
  const failAuditFor = (actorId: string) =>
    db.run(sql.raw(
      `CREATE TRIGGER fail_audit_${actorId.replace(/\W/g, "_")} BEFORE INSERT ON audit_logs ` +
        `WHEN NEW.actor_id = '${actorId.replace(/'/g, "")}' BEGIN SELECT RAISE(ABORT, 'audit 실패 주입'); END`,
    ));

  it("생성: audit 실패 시 요청이 남지 않는다", async () => {
    const u = await makeUser();
    await failAuditFor(u.id);
    expect(await code(svc.createRequest(u, input("롤백 생성")))).not.toBe("OK");
    expect((await svc.listRequests(u, { page: 1, pageSize: 100 })).items).toHaveLength(0);
  });

  it("수정·삭제: audit 실패 시 값과 행이 그대로다", async () => {
    const u = await makeUser();
    const r = await svc.createRequest(u, input("원본"));
    await failAuditFor(u.id);
    expect(await code(svc.updateRequest(u, r.id, { title: "변경" }))).not.toBe("OK");
    expect(await code(svc.deleteRequest(u, r.id))).not.toBe("OK");
    expect((await svc.getRequest(u, r.id)).title).toBe("원본");
  });

  it("상태 전이: audit 실패 시 상태가 그대로다", async () => {
    const [u, ap] = await Promise.all([makeUser(), makeUser("APPROVER")]);
    const r = await svc.createRequest(u, input());
    await failAuditFor(ap.id);
    expect(await code(svc.transitionRequest(ap, r.id, TransitionInput.parse({ action: "approve" })))).not.toBe("OK");
    expect((await svc.getRequest(u, r.id)).status).toBe("PENDING");
  });
});
