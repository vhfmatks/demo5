// 회의실 관리 [Server] — 목록(비활성 포함) + 등록
import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/server/auth/session";
import { listRoomsForAdmin } from "@/features/rooms/service";
import { RoomTable } from "@/features/rooms/components/RoomTable";
import { RoomForm } from "@/features/rooms/components/RoomForm";

export default async function AdminRoomsPage() {
  const user = await requirePermission("room.manage");
  const rooms = await listRoomsForAdmin(user);
  return (
    <>
      <PageHeader title="회의실" description={`총 ${rooms.length}개 · 사용 중 ${rooms.filter((r) => r.active).length}개`} />
      <div className="flex flex-col gap-6">
        <Card title="목록"><RoomTable rows={rooms} /></Card>
        <Card title="회의실 등록"><RoomForm /></Card>
      </div>
    </>
  );
}
