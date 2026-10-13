import { api, body, created, ok, query } from "@/server/http/handler";
import { CreateBookingInput, ListBookingQuery } from "@/features/bookings/schema";
import { createBooking, listBookings } from "@/features/bookings/service";

export const GET = api(async ({ req, user }) => {
  const { items, meta } = await listBookings(user, query(req, ListBookingQuery));
  return ok(items, meta);
});

export const POST = api(async ({ req, user }) => created(await createBooking(user, await body(req, CreateBookingInput))));

export const runtime = "nodejs";
