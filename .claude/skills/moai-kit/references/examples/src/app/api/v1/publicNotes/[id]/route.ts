import { api, body, IdParams, noContent, ok, query } from "@/server/http/handler";
import { DeletePublicNoteQuery, UpdatePublicNoteInput } from "@/features/publicNotes/schema";
import { deletePublicNote, getPublicNote, updatePublicNote } from "@/features/publicNotes/service";

type P = { id: string };
export const GET = api<P>(async ({ params, user }) => ok(await getPublicNote(user, params.id)), { auth: "public", params: IdParams });
export const PATCH = api<P>(async ({ req, params, user }) =>
  ok(await updatePublicNote(user, params.id, await body(req, UpdatePublicNoteInput))),
{ auth: "public", params: IdParams });
export const DELETE = api<P>(async ({ req, params, user }) => {
  const { version } = query(req, DeletePublicNoteQuery);
  await deletePublicNote(user, params.id, version);
  return noContent();
}, { auth: "public", params: IdParams });

export const runtime = "nodejs";
