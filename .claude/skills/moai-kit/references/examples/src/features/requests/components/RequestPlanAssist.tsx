"use client";
// [Client] 수행계획 편집 + AI 초안 보조(작은 컴포넌트). AI 초안은 미리보기에만 나오고, [편집칸에 가져오기]를 눌러야 편집칸에 들어간다.
// 편집이 바뀌거나 저장된 뒤 늦게 도착한 초안, version 이 다른 초안은 표시하지 않는다. AI 가 꺼져 있거나 실패해도 직접 입력·저장은 그대로 된다.
// 편집 시작 시점의 version 을 state 로 고정하고 저장할 때 그대로 보낸다(서버 props 가 바뀌어도 최신 version 을 붙이지 않는다).
import { useRef, useState } from "react";
import { Alert, Button, Field, Textarea } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { useMutation } from "@/lib/use-mutation";
import { SaveExecutionPlanInput, type PlanSuggestion, type RequestDto } from "../schema";

export function RequestPlanAssist({ id, initialPlan, initialVersion, ai = false }: {
  id: string;
  initialPlan: string | null;
  initialVersion: number;
  ai?: boolean;
}) {
  const [plan, setPlan] = useState(initialPlan ?? "");
  const [baseline, setBaseline] = useState(initialPlan ?? ""); // 마지막으로 저장된(또는 처음 본) 글. 다르면 저장 안 한 편집이 있다.
  const [version, setVersion] = useState(initialVersion);
  const [draft, setDraft] = useState<PlanSuggestion | null>(null);
  const [notice, setNotice] = useState("");
  // 비동기 응답은 렌더 시점 값이 아니라 최신 값으로 판정한다. requestSeq 는 편집·저장·재요청이 있을 때마다 올라가 이전 응답을 무효로 만든다.
  const versionRef = useRef(initialVersion);
  const requestSeq = useRef(0);

  const suggest = useMutation(
    async (seq: number) => ({ seq, ...(await apiClient.post<PlanSuggestion>(`/api/v1/requests/${id}/plan/suggest`, { expectedVersion: versionRef.current })) }),
    {
      refresh: false,
      onSuccess: ({ seq, ...r }) => {
        if (seq === requestSeq.current && r.sourceVersion === versionRef.current) setDraft(r);
        else setNotice("편집 내용이 바뀌어 AI 초안을 표시하지 않았습니다. 필요하면 다시 만들어 주세요.");
      },
    },
  );
  const save = useMutation(
    (v: SaveExecutionPlanInput) => apiClient.put<RequestDto>(`/api/v1/requests/${id}/plan`, v),
    {
      schema: SaveExecutionPlanInput, // 저장 후 서버 화면(상세·목록)도 새로 고친다. 이 컴포넌트의 state 는 유지된다.
      onSuccess: (r) => {
        versionRef.current = r.version;
        requestSeq.current += 1;
        setVersion(r.version);
        setPlan(r.executionPlan ?? "");
        setBaseline(r.executionPlan ?? "");
        setDraft(null);
        setNotice("수행계획을 저장했습니다.");
      },
    },
  );
  const fe = save.fieldErrors;

  return (
    <form
      noValidate
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setNotice("");
        save.run({ executionPlan: plan, expectedVersion: version });
      }}
    >
      {ai && (
        <div className="flex flex-col gap-2">
          <div>
            <Button variant="tertiary" size="small" loading={suggest.pending} disabled={save.pending}
              onClick={() => { setDraft(null); setNotice(""); requestSeq.current += 1; suggest.run(requestSeq.current); }}>AI 초안 만들기</Button>
          </div>
          <p className="body-small-medium text-muted">저장된 제목·내용으로 만듭니다. 위 폼에서 고친 내용은 먼저 저장해야 반영됩니다.</p>
          <Alert>{suggest.error}</Alert>
          {draft && (
            <section className="flex flex-col gap-2 rounded-md border border-line p-3" aria-label="AI 초안 미리보기">
              <p className="body-small-medium text-muted">AI 초안 (아직 저장되지 않았습니다)</p>
              <p className="body-medium-medium whitespace-pre-wrap" data-testid="plan-draft">{draft.plan}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="tertiary" size="small" disabled={save.pending}
                  onClick={() => { setPlan(draft.plan); setDraft(null); setNotice(""); }}>
                  {plan.trim() !== baseline.trim() ? "저장 안 한 편집을 덮어쓰고 가져오기" : "편집칸에 가져오기"}
                </Button>
                <Button variant="tertiary" size="small" onClick={() => setDraft(null)}>버리기</Button>
              </div>
            </section>
          )}
        </div>
      )}
      <Field label="수행계획" name="executionPlan" error={fe.executionPlan} hint="2000자 이하. 비워서 저장하면 삭제됩니다.">
        <Textarea
          name="executionPlan"
          value={plan}
          disabled={save.pending}
          invalid={!!fe.executionPlan}
          onChange={(e) => { requestSeq.current += 1; setPlan(e.target.value); }}
        />
      </Field>
      <Alert>{save.error}</Alert>
      <Alert tone="info">{notice}</Alert>
      {/* 화면의 primary 는 위 요청 폼의 [저장] 하나. 수행계획 저장은 단독 보조 동작(tertiary) */}
      <div><Button type="submit" variant="tertiary" loading={save.pending}>수행계획 저장</Button></div>
    </form>
  );
}
