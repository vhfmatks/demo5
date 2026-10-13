import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { canCreate } from "@/features/publicNotes/policy";
import { PublicNoteForm } from "@/features/publicNotes/components/PublicNoteForm";

export default function NewPublicNotePage() {
  if (!canCreate()) notFound();
  return <><PageHeader title="새 공개 메모" /><Card><PublicNoteForm /></Card></>;
}
