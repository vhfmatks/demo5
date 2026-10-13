// [Server] 처리 이력 타임라인 (감사로그 기반)
import { EmptyState } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { HISTORY_LABEL, STATUS_LABEL, type RequestHistoryDto, type RequestStatus } from "../schema";

const describe = (h: RequestHistoryDto) => {
  const d = h.detail ?? {};
  if (typeof d.to === "string") {
    const note = typeof d.note === "string" && d.note ? ` · "${d.note}"` : "";
    return `${STATUS_LABEL[d.from as RequestStatus] ?? d.from} → ${STATUS_LABEL[d.to as RequestStatus] ?? d.to}${note}`;
  }
  if (Array.isArray(d.fields)) return `변경 항목: ${d.fields.join(", ")}`;
  if (typeof d.length === "number") return `수행계획 ${d.length}자 저장`; // 계획 원문은 감사로그에 없다
  return "";
};

export function RequestHistory({ items }: { items: RequestHistoryDto[] }) {
  if (!items.length) return <EmptyState title="기록된 이력이 없습니다." />;
  return (
    <ol className="kds-list kds-list--divided" data-testid="history">
      {items.map((h) => (
        <li key={h.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
          <span className="body-medium-bold w-12">{HISTORY_LABEL[h.action] ?? h.action}</span>
          <span className="body-medium-medium">{h.actor?.name ?? "시스템"}</span>
          <span className="body-small-medium text-muted">{fmtDateTime(h.createdAt)}</span>
          <span className="body-small-medium text-muted">{describe(h)}</span>
        </li>
      ))}
    </ol>
  );
}
