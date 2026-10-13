import { api, body, created, ok, query } from "@/server/http/handler";
import { CreatePublicNoteInput, ListPublicNoteQuery } from "@/features/publicNotes/schema";
import { createPublicNote, listPublicNotes } from "@/features/publicNotes/service";

export const GET = api(async ({ req, user }) => {
  const { items, meta } = await listPublicNotes(user, query(req, ListPublicNoteQuery));
  return ok(items, meta);
}, { auth: "public" });

export const POST = api(async ({ req, user }) =>
  created(await createPublicNote(user, await body(req, CreatePublicNoteInput))),
{ auth: "public" });

export const runtime = "nodejs";
