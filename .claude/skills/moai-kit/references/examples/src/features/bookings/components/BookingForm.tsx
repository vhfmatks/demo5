"use client";
// [Client] 예약 생성·수정 폼. 타임라인에서 넘어온 회의실·날짜·시작 시각을 기본값으로 받는다.
// 공유 스키마로 입력을 검증하고, 겹침·수용 인원은 서버에서 검사한다.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, DatePicker, Field, Input, Select, Tag, Textarea } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { formValues, useMutation } from "@/lib/use-mutation";
import { CreateBookingInput, MAX_OCCURRENCES, RecurringBookingInput, SLOT_TIMES, type BookingDto, type RecurringBookingPreview, type RoomDto } from "../schema";

export type BookingFormDefaults = { roomId?: string; date: string; start?: string; end?: string; attendees?: number; title?: string; memo?: string };

const plusHour = (t: string) => SLOT_TIMES[Math.min(SLOT_TIMES.indexOf(t) + 2, SLOT_TIMES.length - 1)];

export function BookingForm({ id, rooms, defaults, recurring = false }: { id?: string; rooms: RoomDto[]; defaults: BookingFormDefaults; recurring?: boolean }) {
  const router = useRouter();
  const [start, setStart] = useState(defaults.start ?? "09:00");
  const [end, setEnd] = useState(defaults.end ?? plusHour(defaults.start ?? "09:00"));
  const [review, setReview] = useState<{ values: Record<string, string>; preview: RecurringBookingPreview } | null>(null);
  const [checking, setChecking] = useState(false);
  const p = useMutation(async (values: Record<string, string>) => ({
    values, preview: await apiClient.post<RecurringBookingPreview>("/api/v1/bookings/recurring/preview", values),
  }), { schema: RecurringBookingInput, onSuccess: setReview, refresh: false });
  const m = useMutation(
    async (v: Record<string, string>) => {
      if (recurring) return apiClient.post<BookingDto[]>("/api/v1/bookings/recurring", v);
      return [id ? await apiClient.patch<BookingDto>(`/api/v1/bookings/${id}`, v) : await apiClient.post<BookingDto>("/api/v1/bookings", v)];
    },
    { schema: recurring ? RecurringBookingInput : CreateBookingInput, onSuccess: (r) => router.push(recurring ? "/bookings/mine" : `/bookings/${r[0].id}`) },
  );
  const active = checking ? p : m;
  const fe = active.fieldErrors;
  const times = (list: string[]) => list.map((t) => ({ value: t, label: t }));
  return (
    <form noValidate className="max-w-xl" onChange={() => setReview(null)} onSubmit={(e) => {
      e.preventDefault();
      if (recurring) { setChecking(true); setReview(null); p.run(formValues(e.currentTarget)); }
      else m.run(formValues(e.currentTarget));
    }}>
      <fieldset disabled={m.pending || p.pending} className="flex min-w-0 flex-col gap-4">
      <Field label="회의실" name="roomId" required error={fe.roomId}>
        <Select name="roomId" defaultValue={defaults.roomId ?? ""} placeholder="선택" invalid={!!fe.roomId}
          options={rooms.map((r) => ({ value: r.id, label: `${r.name} (최대 ${r.capacity}명 · ${r.location})` }))} />
      </Field>
      <DatePicker label="날짜" name="date" required error={fe.date} defaultValue={defaults.date} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="시작" name="start" required error={fe.start}>
          <Select name="start" value={start} invalid={!!fe.start} options={times(SLOT_TIMES.slice(0, -1))}
            onChange={(e) => { setStart(e.target.value); if (end <= e.target.value) setEnd(plusHour(e.target.value)); }} />
        </Field>
        <Field label="종료" name="end" required error={fe.end}>
          <Select name="end" value={end} invalid={!!fe.end} options={times(SLOT_TIMES.slice(1))} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <Field label="인원" name="attendees" required error={fe.attendees}>
        <Input name="attendees" type="number" min={1} defaultValue={defaults.attendees ?? 2} invalid={!!fe.attendees} />
      </Field>
      <Field label="제목" name="title" required error={fe.title}>
        <Input name="title" defaultValue={defaults.title} invalid={!!fe.title} />
      </Field>
      <Field label="메모" name="memo" error={fe.memo}>
        <Textarea name="memo" defaultValue={defaults.memo} invalid={!!fe.memo} />
      </Field>
      {recurring && <>
        <div className="grid grid-cols-2 gap-4">
          <Field label="반복 횟수" name="occurrences" required error={fe.occurrences}>
            <Input name="occurrences" type="number" min={2} max={MAX_OCCURRENCES} defaultValue={4} invalid={!!fe.occurrences} />
          </Field>
          <Field label="반복 간격 (주)" name="intervalWeeks" required error={fe.intervalWeeks}>
            <Select name="intervalWeeks" defaultValue="1" invalid={!!fe.intervalWeeks} options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n}주마다` }))} />
          </Field>
        </div>
        {review && <section aria-label="반복 일정 미리보기" className="flex flex-col gap-2">
          <p className="body-medium-medium">총 {review.preview.slots.length}회 · 확정할 때 예약 가능 여부를 다시 검사합니다.</p>
          <ul className="flex flex-col gap-2">
            {review.preview.slots.map((slot) => <li key={slot.date} className="flex flex-wrap items-center gap-2">
              <span>{slot.date} {slot.start}–{slot.end}</span>
              {slot.available ? <span className="text-muted">예약 가능</span> : <Tag tone="critical">충돌</Tag>}
            </li>)}
          </ul>
          {!review.preview.canCreate && <Alert>충돌하는 일정이 있습니다. 날짜 또는 시간을 변경해 다시 확인해 주세요.</Alert>}
        </section>}
      </>}
      <Alert>{active.error}</Alert>
      <div className="flex gap-2">
        <Button type="submit" variant={recurring && review?.preview.canCreate ? "tertiary" : "primary"} loading={recurring ? p.pending : m.pending}>{recurring ? "일정 확인" : id ? "저장" : "예약"}</Button>
        {recurring && review?.preview.canCreate && <Button loading={m.pending} onClick={() => { setChecking(false); m.run(review.values); }}>전체 예약 확정</Button>}
        <Button variant="secondary" onClick={() => router.back()}>취소</Button>
      </div>
      </fieldset>
    </form>
  );
}
