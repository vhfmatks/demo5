"use client";
// [Client] 상세 화면의 상태 전이·삭제 버튼. 표시 여부는 서버가 계산한 actions 로만 결정.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, ConfirmDialog, Field, Input, LinkButton } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { useMutation } from "@/lib/use-mutation";
import type { TransitionAction } from "../schema";

const LABEL: Record<TransitionAction, string> = { approve: "승인", reject: "반려", cancel: "요청 취소" };

export function RequestActions({
  id,
  actions,
  canEdit,
  canDelete,
}: {
  id: string;
  actions: TransitionAction[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const t = useMutation((action: TransitionAction) => apiClient.post(`/api/v1/requests/${id}/transition`, { action, note: note || undefined }));
  const d = useMutation(() => apiClient.del(`/api/v1/requests/${id}`), { onSuccess: () => router.push("/requests"), refresh: false });

  if (!actions.length && !canEdit && !canDelete) return <p className="text-sm text-muted">처리할 수 있는 작업이 없습니다.</p>;
  return (
    <div className="flex flex-col gap-3">
      {(actions.includes("approve") || actions.includes("reject")) && (
        <Field label="처리 의견 (반려 시 필수)" name="note" error={t.fieldErrors.note}>
          <Input name="note" value={note} onChange={(e) => setNote(e.target.value)} invalid={!!t.fieldErrors.note} />
        </Field>
      )}
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a} variant={a === "approve" ? "primary" : "secondary"} loading={t.pending} onClick={() => t.run(a)}>
            {LABEL[a]}
          </Button>
        ))}
        {canEdit && <LinkButton href={`/requests/${id}/edit`} variant="tertiary">수정</LinkButton>}
        {canDelete && <Button variant="tertiary" onClick={() => setConfirming(true)}>삭제</Button>}
      </div>
      <Alert>{t.error}</Alert>
      <ConfirmDialog open={confirming} title="요청을 삭제할까요?" confirmLabel="삭제 확인"
        loading={d.pending} onConfirm={() => d.run(undefined)} onCancel={() => setConfirming(false)}>
        <Alert>{d.error}</Alert>
      </ConfirmDialog>
    </div>
  );
}
