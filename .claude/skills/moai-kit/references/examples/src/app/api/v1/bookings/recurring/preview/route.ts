import { RecurringBookingInput } from "@/features/bookings/schema";
import { previewRecurringBookings } from "@/features/bookings/service";
import { api, body, ok } from "@/server/http/handler";

export const runtime = "nodejs";
export const POST = api(async ({ req, user }) =>
  ok(await previewRecurringBookings(user, await body(req, RecurringBookingInput))));
