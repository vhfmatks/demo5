import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/server/auth/session";
import { load } from "@/server/http/page";
import { getPublicNote } from "@/features/publicNotes/service";
import { canEdit } from "@/features/publicNotes/policy";
import { PublicNoteForm } from "@/features/publicNotes/components/PublicNoteForm";

export default async function EditPublicNotePage({ params }: PageProps<"/publicNotes/[id]/edit">) {
  const actor = await getCurrentUser();
  const row = await load(getPublicNote(actor, (await params).id));
  if (!canEdit()) notFound();
  return <><PageHeader title="공개 메모 수정" /><Card><PublicNoteForm initial={row} /></Card></>;
}
