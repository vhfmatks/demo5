"use client";
// [Client] 회의실 등록·수정 폼. initial 이 있으면 수정(PATCH).
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { formValues, useMutation } from "@/lib/use-mutation";
import { CreateRoomInput, type AdminRoomDto } from "../schema";

export function RoomForm({ initial }: { initial?: AdminRoomDto }) {
  const router = useRouter();
  const m = useMutation(
    (v: Record<string, string>) =>
      initial ? apiClient.patch<AdminRoomDto>(`/api/v1/admin/rooms/${initial.id}`, v) : apiClient.post<AdminRoomDto>("/api/v1/admin/rooms", v),
    { schema: CreateRoomInput, onSuccess: (r) => router.push(`/admin/rooms/${r.id}`) },
  );
  const fe = m.fieldErrors;
  return (
    <form noValidate className="flex max-w-xl flex-col gap-4" onSubmit={(e) => { e.preventDefault(); m.run(formValues(e.currentTarget)); }}>
      <Field label="이름" name="name" required error={fe.name}>
        <Input name="name" defaultValue={initial?.name} invalid={!!fe.name} />
      </Field>
      <Field label="위치" name="location" error={fe.location}>
        <Input name="location" defaultValue={initial?.location} placeholder="예: 본관 3층" invalid={!!fe.location} />
      </Field>
      <Field label="수용 인원" name="capacity" required error={fe.capacity}>
        <Input name="capacity" type="number" min={1} defaultValue={initial?.capacity ?? 4} invalid={!!fe.capacity} />
      </Field>
      <Alert>{m.error}</Alert>
      <div className="flex gap-2">
        <Button type="submit" loading={m.pending}>{initial ? "저장" : "등록"}</Button>
        {initial && <Button variant="secondary" onClick={() => router.back()}>취소</Button>}
      </div>
    </form>
  );
}
