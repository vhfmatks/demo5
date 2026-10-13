// [Server] 목록 표 — 컬럼 정의만 이 파일에서 관리
import { DataTable, type Column } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { CATEGORY_LABEL, type RequestDto } from "../schema";
import { StatusBadge } from "./StatusBadge";

const columns: Column<RequestDto>[] = [
  { key: "title", header: "제목", render: (r) => r.title },
  { key: "category", header: "분류", render: (r) => CATEGORY_LABEL[r.category] },
  { key: "status", header: "상태", render: (r) => <StatusBadge status={r.status} /> },
  { key: "requester", header: "요청자", render: (r) => r.requester.name },
  { key: "createdAt", header: "등록일", render: (r) => fmtDateTime(r.createdAt), className: "whitespace-nowrap" },
];

export const RequestTable = ({ rows, empty = "등록된 요청이 없습니다." }: { rows: RequestDto[]; empty?: string }) => (
  <DataTable rows={rows} columns={columns} empty={empty} rowHref={(r) => `/requests/${r.id}`} />
);
