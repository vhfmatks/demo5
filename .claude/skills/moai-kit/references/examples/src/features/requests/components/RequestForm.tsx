"use client";
// [Client] 생성·수정 공용 폼. initial 이 있으면 수정 모드(PATCH). ai = 기본 AI 모델이 있으면 [AI 분류 추천] 표시(결과는 선택지에 채우기만).
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, Select, Textarea, toOptions } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { formValues, useMutation } from "@/lib/use-mutation";
import { CATEGORY_LABEL, CreateRequestInput, type RequestDto, type RequestSuggestion } from "../schema";

export function RequestForm({ initial, ai = false }: { initial?: RequestDto; ai?: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [hint, setHint] = useState("");
  const suggest = useMutation((v: Record<string, string>) => apiClient.post<RequestSuggestion>("/api/v1/requests/suggest", { title: v.title, description: v.description }), {
    refresh: false,
    onSuccess: (r) => {
      const select = ref.current?.elements.namedItem("category");
      if (select instanceof HTMLSelectElement) select.value = r.category;
      setHint(`AI 추천: ${CATEGORY_LABEL[r.category]} — ${r.reason}`);
    },
  });
  const m = useMutation(
    (v: Record<string, string>) =>
      initial
        ? apiClient.patch<RequestDto>(`/api/v1/requests/${initial.id}`, v)
        : apiClient.post<RequestDto>("/api/v1/requests", v),
    { schema: CreateRequestInput, onSuccess: (r) => router.push(`/requests/${r.id}`) },
  );
  const fe = m.fieldErrors;
  return (
    <form
      noValidate
      ref={ref}
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        m.run(formValues(e.currentTarget));
      }}
    >
      <Field label="제목" name="title" required error={fe.title}>
        <Input name="title" defaultValue={initial?.title} invalid={!!fe.title} />
      </Field>
      <Field label="분류" name="category" required error={fe.category}>
        <Select name="category" defaultValue={initial?.category ?? ""} options={toOptions(CATEGORY_LABEL)} placeholder="선택" invalid={!!fe.category} />
      </Field>
      {ai && (
        <div className="flex flex-col gap-1">
          <div><Button variant="tertiary" size="small" loading={suggest.pending}
            onClick={() => { setHint(""); if (ref.current) suggest.run(formValues(ref.current)); }}>AI 분류 추천</Button></div>
          <Alert>{suggest.fieldErrors.title?.[0] ?? suggest.error}</Alert>
          <Alert tone="info">{hint}</Alert>
        </div>
      )}
      <Field label="내용" name="description" error={fe.description}>
        <Textarea name="description" defaultValue={initial?.description} invalid={!!fe.description} />
      </Field>
      <Alert>{m.error}</Alert>
      <div className="flex gap-2">
        <Button type="submit" loading={m.pending}>{initial ? "저장" : "등록"}</Button>
        <Button variant="secondary" onClick={() => router.back()}>취소</Button>
      </div>
    </form>
  );
}
