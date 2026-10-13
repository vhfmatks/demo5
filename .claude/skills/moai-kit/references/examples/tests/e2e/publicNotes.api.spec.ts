import { test, expect } from "./fixtures";
import { expectData, expectError, expectNoContent, uniqueTitle } from "./helpers";
import { CommonErrors } from "../../src/lib/error-codes";
import { PublicNoteErrors } from "../../src/features/publicNotes/errors";
import type { PublicNoteDto } from "../../src/features/publicNotes/schema";

const URL = "/api/v1/publicNotes";
test("TC-PUB-API-001 익명 생성·목록·조회·수정·삭제", async ({ apiAs }) => {
  const anon = await apiAs(null);
  const title = uniqueTitle("TC-PUB-API-001");
  const { data } = await expectData<PublicNoteDto>(await anon.post(URL, { data: { title, memo: "합성 메모" } }), 201);
  expect(data).toMatchObject({ title, memo: "합성 메모", version: 1 });
  const list = await expectData<PublicNoteDto[]>(await anon.get(`${URL}?q=${encodeURIComponent(title)}`));
  expect(list.meta).toMatchObject({ total: 1, page: 1, pageSize: 10 });
  expect(list.data[0].id).toBe(data.id);
  const itemURL = `${URL}/${data.id}`;
  await expectData<PublicNoteDto>(await anon.get(itemURL));
  const updated = await expectData<PublicNoteDto>(await anon.patch(itemURL, { data: { title: `${title} 수정`, version: 1 } }));
  expect(updated.data).toMatchObject({ memo: "합성 메모", version: 2 });
  expect((await expectData<PublicNoteDto>(await anon.get(itemURL))).data.title).toBe(`${title} 수정`);
  await expectNoContent(await anon.delete(`${itemURL}?version=2`));
  await expectError(await anon.get(itemURL), PublicNoteErrors.PUBLIC_NOTE_NOT_FOUND);
});

test("TC-PUB-API-002 오래된 version 수정·삭제 거부와 값 불변", async ({ apiAs }) => {
  const first = await apiAs(null);
  const second = await apiAs(null);
  const { data } = await expectData<PublicNoteDto>(await first.post(URL, { data: { title: uniqueTitle("TC-PUB-API-002") } }), 201);
  const itemURL = `${URL}/${data.id}`;
  const updated = await expectData<PublicNoteDto>(await first.patch(itemURL, { data: { memo: "최신 메모", version: 1 } }));
  await expectError(await second.patch(itemURL, { data: { memo: "오래된 화면", version: 1 } }), PublicNoteErrors.PUBLIC_NOTE_VERSION_CONFLICT);
  await expectError(await second.delete(`${itemURL}?version=1`), PublicNoteErrors.PUBLIC_NOTE_VERSION_CONFLICT);
  expect((await expectData<PublicNoteDto>(await first.get(itemURL))).data).toMatchObject(updated.data);
});

test("TC-PUB-API-003 빈 값·version 누락·없는 대상 처리", async ({ apiAs }) => {
  const anon = await apiAs(null);
  const { data } = await expectData<PublicNoteDto>(await anon.post(URL, { data: { title: uniqueTitle("TC-PUB-API-003") } }), 201);
  const itemURL = `${URL}/${data.id}`;
  await expectError(await anon.post(URL, { data: { title: "" } }), CommonErrors.VALIDATION_ERROR);
  await expectError(await anon.patch(itemURL, { data: { title: "버전 없음" } }), CommonErrors.VALIDATION_ERROR);
  await expectError(await anon.patch(itemURL, { data: { version: 1 } }), CommonErrors.VALIDATION_ERROR);
  await expectError(await anon.delete(itemURL), CommonErrors.VALIDATION_ERROR);
  await expectError(await anon.get(`${URL}/${crypto.randomUUID()}`), PublicNoteErrors.PUBLIC_NOTE_NOT_FOUND);
  expect((await expectData<PublicNoteDto>(await anon.get(itemURL))).data).toMatchObject({ title: data.title, version: 1 });
});

test("TC-PUB-API-004 익명 쓰기는 주소당 분당 60회, 초과 시 429·Retry-After·저장값 불변 (SEC-09)", async ({ apiAs }) => {
  const anon = await apiAs(null);
  // 시험마다 다른 주소(문서용 대역)로 버킷을 분리한다. 빈 제목(400)도 쓰기 시도로 센다 → 데이터를 남기지 않는다.
  const headers = { "X-Forwarded-For": `198.51.100.${Math.floor(Math.random() * 250) + 1}, 203.0.113.${Math.floor(Math.random() * 250) + 1}` };
  for (let i = 0; i < 60; i += 1) await expectError(await anon.post(URL, { data: { title: "" }, headers }), CommonErrors.VALIDATION_ERROR);
  const before = (await expectData<PublicNoteDto[]>(await anon.get(URL))).meta?.total;
  const limited = await anon.post(URL, { data: { title: uniqueTitle("TC-PUB-API-004") }, headers });
  const error = await expectError(limited, CommonErrors.HTTP_RATE_LIMITED);
  expect(Number(limited.headers()["retry-after"])).toBe(error.retryAfterSeconds);
  expect((await expectData<PublicNoteDto[]>(await anon.get(URL))).meta?.total).toBe(before);
  await expectData(await anon.get(URL)); // 읽기는 제한하지 않는다
});
