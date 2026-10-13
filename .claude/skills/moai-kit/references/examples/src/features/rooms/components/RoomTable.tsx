// [Server] 회의실 목록 표 (관리자)
import { DataTable, Tag, type Column } from "@/components/ui";
import type { AdminRoomDto } from "../schema";

const columns: Column<AdminRoomDto>[] = [
  { key: "name", header: "이름", render: (r) => r.name },
  { key: "location", header: "위치", render: (r) => r.location || "-" },
  { key: "capacity", header: "수용 인원", render: (r) => `${r.capacity}명`, className: "is-num" },
  { key: "upcoming", header: "예정 예약", render: (r) => `${r.upcomingBookings}건`, className: "is-num" },
  { key: "active", header: "상태", render: (r) => (r.active ? "" : <Tag tone="warning" testId="room-status">비활성</Tag>) },
];

export const RoomTable = ({ rows }: { rows: AdminRoomDto[] }) => (
  <DataTable rows={rows} columns={columns} empty="등록된 회의실이 없습니다." rowHref={(r) => `/admin/rooms/${r.id}`} />
);
