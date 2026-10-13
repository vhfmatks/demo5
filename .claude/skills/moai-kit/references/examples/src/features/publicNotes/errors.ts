import { defineErrors } from "../../lib/error-codes";

export const PublicNoteErrors = defineErrors({
  PUBLIC_NOTE_NOT_FOUND: { category: "NOT_FOUND", message: "공개 메모을(를) 찾을 수 없습니다." },
  PUBLIC_NOTE_READ_FORBIDDEN: { category: "FORBIDDEN", message: "공개 메모 공개 조회가 비활성화되어 있습니다." },
  PUBLIC_NOTE_CREATE_FORBIDDEN: { category: "FORBIDDEN", message: "공개 메모 공개 등록이 비활성화되어 있습니다." },
  PUBLIC_NOTE_EDIT_FORBIDDEN: { category: "FORBIDDEN", message: "공개 메모 공개 수정이 비활성화되어 있습니다." },
  PUBLIC_NOTE_DELETE_FORBIDDEN: { category: "FORBIDDEN", message: "공개 메모 공개 삭제가 비활성화되어 있습니다." },
  PUBLIC_NOTE_VERSION_CONFLICT: { category: "CONFLICT", message: "다른 사용자가 변경했습니다. 새로고침 후 다시 시도해 주세요." },
});
