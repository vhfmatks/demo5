"use client";
// [Client] 예약 상세의 수정·취소. 표시 여부는 서버가 계산한 boolean 으로만 결정.
import { useState } from "react";
import { Alert, Button, ConfirmDialog, Field, Input, LinkButton } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { useMutation } from "@/lib/use-mutation";

export function BookingActions({ id, canEdit, canCancel }: { id: string; canEdit: boolean; canCancel: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const c = useMutation(() => apiClient.post(`/api/v1/bookings/${id}/cancel`, { reason: reason || undefined }), {
    onSuccess: () => setConfirming(false),
  });
  if (!canEdit && !canCancel) return <p className="text-sm text-muted">변경할 수 있는 작업이 없습니다.</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {canEdit && <LinkButton href={`/bookings/${id}/edit`} variant="tertiary">수정</LinkButton>}
        {canCancel && <Button variant="tertiary" onClick={() => setConfirming(true)}>예약 취소</Button>}
      </div>
      <ConfirmDialog open={confirming} title="예약을 취소할까요?" body="취소한 시간은 다른 사람이 예약할 수 있습니다."
        confirmLabel="취소 확인" loading={c.pending} onConfirm={() => c.run(undefined)} onCancel={() => setConfirming(false)}>
        <Field label="취소 사유 (선택)" name="reason" error={c.fieldErrors.reason}>
          <Input name="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Alert>{c.error}</Alert>
      </ConfirmDialog>
    </div>
  );
}
