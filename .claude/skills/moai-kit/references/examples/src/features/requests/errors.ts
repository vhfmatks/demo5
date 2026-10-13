// [공유] 요청 도메인의 공개 오류 계약. 없는 요청과 볼 수 없는 요청은 동일한 코드.
import { defineErrors } from "../../lib/error-codes";

export const RequestErrors = defineErrors({
  REQUEST_NOT_FOUND: { category: "NOT_FOUND", message: "요청을 찾을 수 없습니다." },
  REQUEST_EDIT_FORBIDDEN: { category: "FORBIDDEN", message: "본인 요청만 수정할 수 있습니다." },
  REQUEST_EDIT_NOT_PENDING: { category: "INVALID_STATE", message: "대기 상태의 요청만 수정할 수 있습니다." },
  REQUEST_DELETE_FORBIDDEN: { category: "FORBIDDEN", message: "삭제 권한이 없습니다." },
  REQUEST_DELETE_NOT_PENDING: { category: "INVALID_STATE", message: "대기 상태의 요청만 삭제할 수 있습니다." },
  REQUEST_TRANSITION_FORBIDDEN: { category: "FORBIDDEN", message: "이 요청을 처리할 권한이 없습니다." },
  REQUEST_SELF_DECISION_FORBIDDEN: { category: "FORBIDDEN", message: "본인 요청은 승인하거나 반려할 수 없습니다." },
  REQUEST_TRANSITION_NOT_ALLOWED: { category: "INVALID_STATE", message: "현재 상태에서는 요청을 처리할 수 없습니다." },
  REQUEST_CONCURRENT_MODIFICATION: { category: "INVALID_STATE", message: "다른 사용자가 먼저 처리했습니다. 새로고침해 주세요." },
});
