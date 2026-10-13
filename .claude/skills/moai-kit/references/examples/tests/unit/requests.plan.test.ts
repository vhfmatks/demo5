// 요청 수행계획: AI 초안(무저장·권한·도중 변경) · 저장(version 조건 UPDATE + 같은 트랜잭션 감사) · 모든 쓰기의 version 증가 (SEC-06)
import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db/client";
import { auditLogs } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";
import { aiJson } from "@/features/ai/service";
import { RequestErrors } from "@/features/requests/errors";
import { SaveExecutionPlanInput, SuggestPlanInput } from "@/features/requests/schema";
import { createRequest, deleteRequest, getRequest, saveExecutionPlan, suggestExecutionPlan, transitionRequest, updateRequest } from "@/features/requests/service";
import { makeUser } from "./fixtures";

vi.mock("@/features/ai/service", () => ({ aiJson: vi.fn(), aiAvailable: vi.fn() }));
const ai = vi.mocked(aiJson);
beforeEach(() => {
  ai.mockReset();
  ai.mockResolvedValue({ plan: "1. 확인\n2. 처리" });
});

const code = async (p: Promise<unknown>) => p.then(() => null, (e) => (e instanceof AppError ? e.code : e));
const planAudits = async (id: string) =>
  db.select().from(auditLogs).where(and(eq(auditLogs.entityId, id), eq(auditLogs.action, "request.plan_update"))).all();
async function setup() {
  const [owner, other, approver] = await Promise.all([makeUser("USER"), makeUser("USER"), makeUser("APPROVER")]);
  const r = await createRequest(owner, { title: "모니터 교체", category: "EQUIPMENT", description: "합성 내용" });
  return { owner, other, approver, r };
}

describe("DTO·version", () => {
  it("새 요청은 executionPlan null, version 1이고 수정·상태 전이·계획 저장마다 1씩 오른다", async () => {
    const { owner, approver, r } = await setup();
    expect(r).toMatchObject({ executionPlan: null, version: 1 });
    expect((await updateRequest(owner, r.id, { title: "수정" })).version).toBe(2);
    expect((await saveExecutionPlan(owner, r.id, { executionPlan: "계획", expectedVersion: 2 })).version).toBe(3);
    const done = await transitionRequest(approver, r.id, { action: "approve" });
    expect(done).toMatchObject({ status: "APPROVED", version: 4, executionPlan: "계획" });
  });

  it("같은 요청의 동시 승인·취소는 한 건만 반영된다 (version 조건 포함)", async () => {
    const { owner, approver, r } = await setup();
    const results = await Promise.allSettled([
      transitionRequest(approver, r.id, { action: "approve" }),
      transitionRequest(owner, r.id, { action: "cancel" }),
    ]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect((await getRequest(owner, r.id)).version).toBe(2);
  });

  it("삭제도 확인한 version 조건으로 지운다", async () => {
    const { owner, r } = await setup();
    await deleteRequest(owner, r.id);
    expect(await code(getRequest(owner, r.id))).toBe(RequestErrors.REQUEST_NOT_FOUND.code);
  });
});

describe("공유 입력 스키마", () => {
  it("저장: 계획·expectedVersion 만 허용, 2000자 초과·잘못된 version·서버 소유/출처 필드는 거부", () => {
    expect(SaveExecutionPlanInput.safeParse({ executionPlan: " 계획 ", expectedVersion: 1 })).toMatchObject({ success: true, data: { executionPlan: "계획" } });
    expect(SaveExecutionPlanInput.safeParse({ executionPlan: "", expectedVersion: 1 }).success).toBe(true);
    expect(SaveExecutionPlanInput.safeParse({ executionPlan: "가".repeat(2000), expectedVersion: 1 }).success).toBe(true);
    for (const bad of [
      { executionPlan: "가".repeat(2001), expectedVersion: 1 },
      { executionPlan: "x" },
      { executionPlan: "x", expectedVersion: 0 },
      { executionPlan: "x", expectedVersion: 1.5 },
      { executionPlan: "x", expectedVersion: "1" },
      { executionPlan: "x", expectedVersion: 1, source: "ai" },
      { executionPlan: "x", expectedVersion: 1, requesterId: crypto.randomUUID() },
    ]) expect(SaveExecutionPlanInput.safeParse(bad).success).toBe(false);
  });

  it("생성: expectedVersion 만 허용 (제목·내용을 클라이언트가 보내지 못한다)", () => {
    expect(SuggestPlanInput.safeParse({ expectedVersion: 1 }).success).toBe(true);
    expect(SuggestPlanInput.safeParse({ expectedVersion: 1, title: "주입" }).success).toBe(false);
    expect(SuggestPlanInput.safeParse({}).success).toBe(false);
  });
});

describe("AI 초안 생성 (무저장)", () => {
  it("DB의 제목·내용만 AI에 보내고 초안+sourceVersion 을 반환할 뿐 요청·감사를 바꾸지 않는다", async () => {
    const { owner, r } = await setup();
    const before = await getRequest(owner, r.id);
    const out = await suggestExecutionPlan(owner, r.id, { expectedVersion: 1 });
    expect(out).toEqual({ plan: "1. 확인\n2. 처리", sourceVersion: 1 });
    const sent = ai.mock.calls[0][1];
    expect(sent).toMatchObject({ feature: "request.plan", prompt: "제목: 모니터 교체\n내용: 합성 내용" });
    expect(`${sent.system}\n${sent.prompt}`).not.toContain(owner.name);
    expect(`${sent.system}\n${sent.prompt}`).not.toContain(owner.email);
    expect(await getRequest(owner, r.id)).toEqual(before);
    expect(await planAudits(r.id)).toHaveLength(0);
  });

  it("권한: 타인 404 · 볼 수 있어도 본인 아니면 403 · 대기 아님 409 · 오래된 version 409 — 모두 AI 호출 전에 거부", async () => {
    const { owner, other, approver, r } = await setup();
    expect(await code(suggestExecutionPlan(other, r.id, { expectedVersion: 1 }))).toBe(RequestErrors.REQUEST_NOT_FOUND.code);
    expect(await code(suggestExecutionPlan(approver, r.id, { expectedVersion: 1 }))).toBe(RequestErrors.REQUEST_EDIT_FORBIDDEN.code);
    expect(await code(suggestExecutionPlan(owner, r.id, { expectedVersion: 7 }))).toBe(RequestErrors.REQUEST_CONCURRENT_MODIFICATION.code);
    await transitionRequest(approver, r.id, { action: "approve" });
    expect(await code(suggestExecutionPlan(owner, r.id, { expectedVersion: 2 }))).toBe(RequestErrors.REQUEST_EDIT_NOT_PENDING.code);
    expect(ai).not.toHaveBeenCalled();
  });

  it("AI 호출 도중 version·상태가 바뀌면 초안을 돌려주지 않는다", async () => {
    const { owner, approver, r } = await setup();
    ai.mockImplementationOnce(async () => {
      await updateRequest(owner, r.id, { title: "도중 수정" });
      return { plan: "늦은 초안" };
    });
    expect(await code(suggestExecutionPlan(owner, r.id, { expectedVersion: 1 }))).toBe(RequestErrors.REQUEST_CONCURRENT_MODIFICATION.code);
    ai.mockImplementationOnce(async () => {
      await transitionRequest(approver, r.id, { action: "approve" });
      return { plan: "늦은 초안" };
    });
    expect(await code(suggestExecutionPlan(owner, r.id, { expectedVersion: 2 }))).toBe(RequestErrors.REQUEST_EDIT_NOT_PENDING.code);
    expect(await planAudits(r.id)).toHaveLength(0);
  });

  it("AI 실패는 그대로 전달되고 저장값은 불변이다 (수동 저장은 계속 가능)", async () => {
    const { owner, r } = await setup();
    ai.mockRejectedValueOnce(new Error("upstream"));
    await expect(suggestExecutionPlan(owner, r.id, { expectedVersion: 1 })).rejects.toThrow("upstream");
    expect(await getRequest(owner, r.id)).toMatchObject({ executionPlan: null, version: 1 });
    expect((await saveExecutionPlan(owner, r.id, { executionPlan: "직접 작성", expectedVersion: 1 })).executionPlan).toBe("직접 작성");
  });
});

describe("수행계획 저장", () => {
  it("성공: 계획 저장·version 증가·감사 1건(계획 원문 없음), 빈 문자열은 삭제(null)", async () => {
    const { owner, r } = await setup();
    const plan = "민감할 수 있는 계획 본문";
    const saved = await saveExecutionPlan(owner, r.id, { executionPlan: plan, expectedVersion: 1 });
    expect(saved).toMatchObject({ executionPlan: plan, version: 2 });
    const audits = await planAudits(r.id);
    expect(audits).toHaveLength(1);
    expect(audits[0].actorId).toBe(owner.id);
    expect(audits[0].detail).toEqual({ fromVersion: 1, length: plan.length });
    expect(JSON.stringify(audits[0])).not.toContain("계획 본문");
    expect(await saveExecutionPlan(owner, r.id, { executionPlan: "", expectedVersion: 2 })).toMatchObject({ executionPlan: null, version: 3 });
  });

  it("오래된 version·타인·대기 아님은 거부되고 데이터·감사는 불변이다", async () => {
    const { owner, other, approver, r } = await setup();
    await saveExecutionPlan(owner, r.id, { executionPlan: "첫 계획", expectedVersion: 1 });
    const before = await getRequest(owner, r.id);
    expect(await code(saveExecutionPlan(owner, r.id, { executionPlan: "오래된 초안", expectedVersion: 1 }))).toBe(RequestErrors.REQUEST_CONCURRENT_MODIFICATION.code);
    expect(await code(saveExecutionPlan(other, r.id, { executionPlan: "탈취", expectedVersion: 2 }))).toBe(RequestErrors.REQUEST_NOT_FOUND.code);
    expect(await code(saveExecutionPlan(approver, r.id, { executionPlan: "대리", expectedVersion: 2 }))).toBe(RequestErrors.REQUEST_EDIT_FORBIDDEN.code);
    expect(await getRequest(owner, r.id)).toEqual(before);
    await transitionRequest(approver, r.id, { action: "approve" });
    expect(await code(saveExecutionPlan(owner, r.id, { executionPlan: "확정 후", expectedVersion: 3 }))).toBe(RequestErrors.REQUEST_EDIT_NOT_PENDING.code);
    expect((await getRequest(owner, r.id)).executionPlan).toBe("첫 계획");
    expect(await planAudits(r.id)).toHaveLength(1);
  });

  it("같은 version 으로 동시 저장하면 한 건만 성공한다", async () => {
    const { owner, r } = await setup();
    const results = await Promise.allSettled(["A", "B", "C"].map((t) => saveExecutionPlan(owner, r.id, { executionPlan: `계획 ${t}`, expectedVersion: 1 })));
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await getRequest(owner, r.id)).toMatchObject({ version: 2 });
    expect(await planAudits(r.id)).toHaveLength(1);
  });

  it("감사 기록이 실패하면 계획·version 이 변경 전으로 롤백된다", async () => {
    const { owner, r } = await setup();
    const before = await getRequest(owner, r.id);
    await db.run(sql.raw("create trigger fail_plan_audit before insert on audit_logs when new.action = 'request.plan_update' begin select raise(abort, 'audit failure'); end"));
    try {
      await expect(saveExecutionPlan(owner, r.id, { executionPlan: "롤백될 계획", expectedVersion: 1 })).rejects.toThrow();
    } finally {
      await db.run(sql.raw("drop trigger fail_plan_audit"));
    }
    expect(await getRequest(owner, r.id)).toEqual(before);
    expect(await planAudits(r.id)).toHaveLength(0);
  });
});
