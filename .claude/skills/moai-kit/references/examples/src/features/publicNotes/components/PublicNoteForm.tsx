"use client";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { formValues, useMutation } from "@/lib/use-mutation";
import { CreatePublicNoteInput, type PublicNoteDto } from "../schema";

export function PublicNoteForm({ initial }: { initial?: PublicNoteDto }) {
  const router = useRouter();
  const m = useMutation((values: Record<string, string>) => initial
    ? apiClient.patch<PublicNoteDto>(`/api/v1/publicNotes/${initial.id}`, { ...values, version: initial.version })
    : apiClient.post<PublicNoteDto>("/api/v1/publicNotes", values),
  { schema: CreatePublicNoteInput, onSuccess: (row) => router.push(`/publicNotes/${row.id}`) });
  return (
    <form noValidate className="flex max-w-xl flex-col gap-4" onSubmit={(event) => {
      event.preventDefault();
      m.run(formValues(event.currentTarget));
    }}>
      <Field label="제목" name="title" required error={m.fieldErrors.title}>
        <Input name="title" defaultValue={initial?.title} invalid={!!m.fieldErrors.title} />
      </Field>
      <Field label="메모" name="memo" error={m.fieldErrors.memo}>
        <Textarea name="memo" defaultValue={initial?.memo} invalid={!!m.fieldErrors.memo} />
      </Field>
      <Alert>{m.error}</Alert>
      <div className="flex gap-2">
        <Button type="submit" loading={m.pending}>{initial ? "저장" : "등록"}</Button>
        <Button variant="secondary" onClick={() => router.back()}>취소</Button>
        {m.failure?.category === "CONFLICT" && <Button variant="tertiary" onClick={() => window.location.reload()}>새로고침</Button>}
      </div>
    </form>
  );
}
