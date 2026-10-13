import { Card, SearchField, LinkButton, PageHeader, Pagination, FilterBar } from "@/components/ui";
import { getCurrentUser } from "@/server/auth/session";
import { listPublicNotes } from "@/features/publicNotes/service";
import { ListPublicNoteQuery } from "@/features/publicNotes/schema";
import { canCreate } from "@/features/publicNotes/policy";
import { PublicNoteTable } from "@/features/publicNotes/components/PublicNoteTable";

export default async function PublicNotesPage({ searchParams }: PageProps<"/publicNotes">) {
  const actor = await getCurrentUser();
  const q = ListPublicNoteQuery.parse(await searchParams);
  const { items, meta } = await listPublicNotes(actor, q);
  return <>
    <PageHeader title="공개 메모" description="로그인 없이 함께 등록·조회·수정·삭제하는 공유 메모입니다."
      actions={canCreate() ? <LinkButton href="/publicNotes/new" variant="tertiary">새 공개 메모</LinkButton> : undefined} />
    <FilterBar>
      <SearchField name="q" label="검색" defaultValue={q.q ?? ""} placeholder="제목 검색" />
    </FilterBar>
    <Card><PublicNoteTable rows={items} /><Pagination meta={meta} basePath="/publicNotes" params={{ q: q.q }} /></Card>
  </>;
}
