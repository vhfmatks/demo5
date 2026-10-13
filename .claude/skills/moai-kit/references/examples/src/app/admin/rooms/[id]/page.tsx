// 회의실 상세·수정 [Server]
import { Card, LinkButton, PageHeader, Tag } from "@/components/ui";
import { requirePermission } from "@/server/auth/session";
import { load } from "@/server/http/page";
import { getRoomForAdmin } from "@/features/rooms/service";
import { RoomForm } from "@/features/rooms/components/RoomForm";
import { RoomActiveToggle } from "@/features/rooms/components/RoomActiveToggle";

export default async function AdminRoomDetailPage({ params }: PageProps<"/admin/rooms/[id]">) {
  const user = await requirePermission("room.manage");
  const room = await load(getRoomForAdmin(user, (await params).id));
  return (
    <>
      <PageHeader title={room.name} description={room.active ? "사용 중" : "사용 중지됨"}
        actions={<>
          {!room.active && <Tag tone="warning" testId="room-status">비활성</Tag>}
          <LinkButton href="/admin/rooms" variant="tertiary">목록</LinkButton>
        </>} />
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="정보 수정" className="md:col-span-3"><RoomForm initial={room} /></Card>
        <Card title="사용 여부"><RoomActiveToggle room={room} /></Card>
      </div>
    </>
  );
}
