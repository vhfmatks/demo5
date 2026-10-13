import { test, expect } from "./fixtures";
import { expectData, expectError, uniqueTitle } from "./helpers";
import { CommonErrors } from "../../src/lib/error-codes";
import type { PublicNoteDto } from "../../src/features/publicNotes/schema";

const URL = "/api/v1/publicNotes";
test("TC-HTTP-API-001 잘못된 JSON 400·지원하지 않는 Content-Type 415", async ({ apiAs }) => {
  const anon = await apiAs(null);
  await expectError(await anon.post(URL, { data: Buffer.from("{"), headers: { "Content-Type": "application/json" } }), CommonErrors.HTTP_INVALID_JSON);
  await expectError(await anon.post(URL, { data: "title=예제", headers: { "Content-Type": "text/plain" } }), CommonErrors.HTTP_CONTENT_TYPE_UNSUPPORTED);
});

test("TC-HTTP-API-002 JSON 64KiB 초과 413·저장값 불변 (SEC-04)", async ({ apiAs }) => {
  const anon = await apiAs(null);
  const before = (await expectData<PublicNoteDto[]>(await anon.get(URL))).meta?.total;
  await expectError(await anon.post(URL, { data: { title: "초과", memo: "a".repeat(70_000) } }), CommonErrors.HTTP_PAYLOAD_TOO_LARGE);
  expect((await expectData<PublicNoteDto[]>(await anon.get(URL))).meta?.total).toBe(before);
});

test("TC-HTTP-API-003 Origin 누락·잘못된 형식 거부 (SEC-04)", async ({ apiAs }) => {
  const missing = await apiAs(null, { origin: false });
  await expectError(await missing.post(URL, { data: { title: "Origin 없음" } }), CommonErrors.HTTP_ORIGIN_REQUIRED);
  const anon = await apiAs(null);
  await expectError(await anon.post(URL, { data: { title: "잘못된 Origin" }, headers: { Origin: "not-an-origin" } }), CommonErrors.HTTP_INVALID_ORIGIN);
});

test("TC-HTTP-API-004 같은 host여도 다른 scheme·port 거부 (SEC-04)", async ({ apiAs, baseURL }) => {
  const anon = await apiAs(null);
  if (!baseURL) throw new Error("표준 baseURL이 필요합니다.");
  const altered = new globalThis.URL(baseURL);
  altered.protocol = "https:";
  await expectError(await anon.post(URL, { data: { title: "다른 scheme" }, headers: { Origin: altered.origin } }), CommonErrors.HTTP_ORIGIN_REJECTED);
  altered.protocol = "http:";
  altered.port = String(Number(altered.port) === 65535 ? 65534 : Number(altered.port) + 1);
  await expectError(await anon.post(URL, { data: { title: "다른 port" }, headers: { Origin: altered.origin } }), CommonErrors.HTTP_ORIGIN_REJECTED);
});

test("TC-HTTP-API-005 UUID 경로·unknown 필드 검증과 query 보정", async ({ apiAs }) => {
  const anon = await apiAs(null);
  const idError = await expectError(await anon.get(`${URL}/invalid-id`), CommonErrors.VALIDATION_ERROR);
  expect(idError.fieldErrors?.id).toBeTruthy();
  await expectError(await anon.post(URL, { data: { title: uniqueTitle("TC-HTTP-API-005"), ownerId: crypto.randomUUID() } }), CommonErrors.VALIDATION_ERROR);
  const list = await expectData<PublicNoteDto[]>(await anon.get(`${URL}?page=wrong&pageSize=1000`));
  expect(list.meta).toMatchObject({ page: 1, pageSize: 10 });
});

test("TC-HTTP-API-006 화면·API 응답 보안 헤더, 서버 정보 비노출 (SEC-06)", async ({ apiAs }) => {
  const anon = await apiAs(null);
  for (const response of [await anon.get("/login"), await anon.get("/api/v1/auth/me")]) {
    const h = response.headers();
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  }
});
