// E2E 예제용: 관리자 API 로 가짜 공급자 + 기본 모델을 등록한다. 가짜 공급자 본체(startMockAi)는 base 의 tests/ai-mock.ts 를 쓴다
// (예제가 ai-mock.ts 를 통째로 덮어쓰면 base 의 mock 변경과 어긋나므로 이 파일로 분리).
import type { APIRequestContext } from "@playwright/test";
import { MOCK_AI_KEY } from "./ai-mock";

/** 반환 함수로 삭제(기본 모델이 다른 시험에 남지 않게). */
export async function registerMockModel(admin: APIRequestContext, mock: { openai: string }) {
  const name = `가짜 AI ${crypto.randomUUID().slice(0, 8)}`;
  const provider = await admin.post("/api/v1/admin/ai/providers", { data: { name, kind: "openai", baseUrl: mock.openai, apiKey: MOCK_AI_KEY } });
  if (provider.status() !== 201) throw new Error(`공급자 등록 실패: ${await provider.text()}`);
  const { data } = (await provider.json()) as { data: { id: string } };
  const model = await admin.post("/api/v1/admin/ai/models", { data: { providerId: data.id, model: "mock-small", label: name, isDefault: true } });
  if (model.status() !== 201) throw new Error(`모델 등록 실패: ${await model.text()}`);
  return async () => {
    await admin.delete(`/api/v1/admin/ai/providers/${data.id}`);
  };
}
