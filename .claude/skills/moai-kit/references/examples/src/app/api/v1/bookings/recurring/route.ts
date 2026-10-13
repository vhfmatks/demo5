import { RecurringBookingInput } from "@/features/bookings/schema";
import { createRecurringBookings } from "@/features/bookings/service";
import { api, body, created } from "@/server/http/handler";

export const runtime = "nodejs";
export const POST = api(async ({ req, user }) =>
  created(await createRecurringBookings(user, await body(req, RecurringBookingInput))));
