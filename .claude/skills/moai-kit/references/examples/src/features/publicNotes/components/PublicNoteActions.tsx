"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, ConfirmDialog, LinkButton } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { useMutation } from "@/lib/use-mutation";

export function PublicNoteActions({ id, version, canEdit, canDelete }: {
  id: string; version: number; canEdit: boolean; canDelete: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const d = useMutation(() => apiClient.del(`/api/v1/publicNotes/${id}?version=${version}`), {
    onSuccess: () => router.push("/publicNotes"), refresh: false,
  });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {canEdit && <LinkButton href={`/publicNotes/${id}/edit`} variant="tertiary">수정</LinkButton>}
        {canDelete && <Button variant="tertiary" onClick={() => setConfirming(true)}>삭제</Button>}
      </div>
      <ConfirmDialog open={confirming} title="이 메모를 삭제할까요?" body="삭제한 메모는 되돌릴 수 없어요." confirmLabel="삭제 확인"
        loading={d.pending} onConfirm={() => d.run(undefined)} onCancel={() => setConfirming(false)}>
        <Alert>{d.error}</Alert>
        {d.failure?.category === "CONFLICT" && <Button variant="text" onClick={() => window.location.reload()}>새로고침</Button>}
      </ConfirmDialog>
    </div>
  );
}
