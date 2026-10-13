// [Server] GET 폼 필터 — JS 없이 URL 쿼리로 동작 (?view=&status=&category=&q=). staff=false 면 보기 선택 숨김, 결재 대기 보기는 상태 고정.
import { SearchField, Select, toOptions, FilterBar } from "@/components/ui";
import { CATEGORY_LABEL, STATUS_LABEL, VIEW_LABEL, type ListRequestQuery } from "../schema";

export const RequestFilters = ({ q, staff = false }: { q: ListRequestQuery; staff?: boolean }) => (
  <FilterBar>
    {staff && <Select name="view" aria-label="보기" defaultValue={q.view} options={toOptions(VIEW_LABEL)} className="w-36" />}
    {q.view !== "inbox" && <Select name="status" aria-label="상태" defaultValue={q.status ?? ""} options={toOptions(STATUS_LABEL)} placeholder="전체 상태" className="w-36" />}
    <Select name="category" aria-label="분류" defaultValue={q.category ?? ""} options={toOptions(CATEGORY_LABEL)} placeholder="전체 분류" className="w-36" />
    <SearchField name="q" label="제목 검색" defaultValue={q.q ?? ""} placeholder="제목 검색" className="w-56" />
  </FilterBar>
);
