// [공유] 공개 메모의 입력·DTO 계약. 생성 기본값을 PATCH에 적용하지 않는다.
import { z } from "zod";

const PublicNoteFields = {
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(100, "100자 이하"),
  memo: z.string().trim().max(2000, "2000자 이하"),
};
export const CreatePublicNoteInput = z.strictObject({
  ...PublicNoteFields,
  memo: PublicNoteFields.memo.default(""),
});
export type CreatePublicNoteInput = z.infer<typeof CreatePublicNoteInput>;

export const UpdatePublicNoteInput = z.strictObject({
  title: PublicNoteFields.title.optional(),
  memo: PublicNoteFields.memo.optional(),
  version: z.int().min(1),
}).refine((input) => input.title !== undefined || input.memo !== undefined, {
  message: "수정할 항목을 하나 이상 입력해 주세요.",
});
export type UpdatePublicNoteInput = z.infer<typeof UpdatePublicNoteInput>;

export const DeletePublicNoteQuery = z.object({ version: z.coerce.number().int().min(1) });
export type DeletePublicNoteQuery = z.infer<typeof DeletePublicNoteQuery>;
export const ListPublicNoteQuery = z.object({
  q: z.string().trim().max(50).optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10).catch(10),
});
export type ListPublicNoteQuery = z.infer<typeof ListPublicNoteQuery>;

export type PublicNoteDto = {
  id: string;
  title: string;
  memo: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};
