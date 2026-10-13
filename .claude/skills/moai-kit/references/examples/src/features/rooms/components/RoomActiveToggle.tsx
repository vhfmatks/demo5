"use client";
// [Client] 회의실 사용 중지·재개. 중지는 확인 팝업, 예정 예약이 있으면 서버가 409 로 거부한다.
import { useState } from "react";
import { Alert, Button, ConfirmDialog } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { useMutation } from "@/lib/use-mutation";
import type { AdminRoomDto } from "../schema";

export function RoomActiveToggle({ room }: { room: AdminRoomDto }) {
  const [confirming, setConfirming] = useState(false);
  const m = useMutation((active: boolean) => apiClient.patch<AdminRoomDto>(`/api/v1/admin/rooms/${room.id}`, { active }), {
    onSuccess: () => setConfirming(false),
  });
  if (!room.active) {
    return (
      <div className="flex flex-col gap-3">
        <p className="body-small-medium text-muted">사용 중지된 회의실은 예약 화면에 보이지 않습니다.</p>
        <div><Button variant="tertiary" loading={m.pending} onClick={() => m.run(true)}>사용 재개</Button></div>
        <Alert>{m.error}</Alert>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="body-small-medium text-muted">예정 예약 {room.upcomingBookings}건</p>
      <div><Button variant="tertiary" onClick={() => setConfirming(true)}>사용 중지</Button></div>
      <ConfirmDialog open={confirming} title="회의실 사용을 중지할까요?" body="예약 화면에서 숨겨지고 새 예약을 받을 수 없습니다. 지난 예약 이력은 유지됩니다."
        confirmLabel="중지 확인" loading={m.pending} onConfirm={() => m.run(false)} onCancel={() => setConfirming(false)}>
        <Alert>{m.error}</Alert>
      </ConfirmDialog>
    </div>
  );
}
