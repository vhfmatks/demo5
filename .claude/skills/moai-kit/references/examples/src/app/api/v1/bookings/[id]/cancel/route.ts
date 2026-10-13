// 예약 취소 POST /api/v1/bookings/{id}/cancel { reason? }
import { api, body, IdParams, ok } from "@/server/http/handler";
import { CancelBookingInput } from "@/features/bookings/schema";
import { cancelBooking } from "@/features/bookings/service";

export const POST = api<{ id: string }>(async ({ req, params, user }) =>
  ok(await cancelBooking(user, params.id, await body(req, CancelBookingInput))),
  { params: IdParams },
);

export const runtime = "nodejs";
