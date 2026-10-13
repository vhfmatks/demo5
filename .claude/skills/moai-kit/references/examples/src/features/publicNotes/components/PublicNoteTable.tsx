import { DataTable, type Column } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import type { PublicNoteDto } from "../schema";

const columns: Column<PublicNoteDto>[] = [
  { key: "title", header: "제목", render: (row) => row.title },
  { key: "memo", header: "메모", render: (row) => row.memo },
  { key: "updatedAt", header: "수정일", render: (row) => fmtDateTime(row.updatedAt), className: "whitespace-nowrap" },
];
export const PublicNoteTable = ({ rows }: { rows: PublicNoteDto[] }) => (
  <DataTable rows={rows} columns={columns} empty="등록된 공개 메모이(가) 없습니다." rowHref={(row) => `/publicNotes/${row.id}`} />
);
