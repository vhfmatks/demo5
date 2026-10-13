// REST: 단건 GET / PATCH(일정·회의실·내용 변경). 삭제 대신 취소(하위 리소스)로 이력을 남긴다.
import { api, body, IdParams, ok } from "@/server/http/handler";
import { UpdateBookingInput } from "@/features/bookings/schema";
import { getBooking, updateBooking } from "@/features/bookings/service";

type P = { id: string };

export const GET = api<P>(async ({ params, user }) => ok(await getBooking(user, params.id)), { params: IdParams });
export const PATCH = api<P>(async ({ req, params, user }) => ok(await updateBooking(user, params.id, await body(req, UpdateBookingInput))), { params: IdParams });

export const runtime = "nodejs";
