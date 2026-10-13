import { Card, DescriptionList, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/server/auth/session";
import { load } from "@/server/http/page";
import { fmtDateTime } from "@/lib/format";
import { getPublicNote } from "@/features/publicNotes/service";
import { canDelete, canEdit } from "@/features/publicNotes/policy";
import { PublicNoteActions } from "@/features/publicNotes/components/PublicNoteActions";

export default async function PublicNoteDetailPage({ params }: PageProps<"/publicNotes/[id]">) {
  const actor = await getCurrentUser();
  const row = await load(getPublicNote(actor, (await params).id));
  return <>
    <PageHeader title={row.title} />
    <div className="grid gap-4 md:grid-cols-2">
      <Card><DescriptionList items={[
        { label: "메모", value: row.memo || "-" },
        { label: "등록일", value: fmtDateTime(row.createdAt) },
        { label: "수정일", value: fmtDateTime(row.updatedAt) },
      ]} /></Card>
      <Card title="관리"><PublicNoteActions id={row.id} version={row.version} canEdit={canEdit()} canDelete={canDelete()} /></Card>
    </div>
  </>;
}
