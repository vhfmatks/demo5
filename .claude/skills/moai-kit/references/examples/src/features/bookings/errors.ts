// [공유] 예약 공개 오류 계약. 새 원인은 BOOKING_REASON 코드로 추가한다.
import { defineErrors } from "../../lib/error-codes";

export const BookingErrors = defineErrors({
  BOOKING_SERIES_CONFLICT: { category: "CONFLICT", message: "반복 일정에 충돌이 있어 전체 예약을 저장하지 않았습니다. 다시 확인해 주세요." },
  BOOKING_NOT_FOUND: { category: "NOT_FOUND", message: "예약을 찾을 수 없습니다." },
  BOOKING_ROOM_UNAVAILABLE: { category: "VALIDATION_ERROR", message: "사용할 수 없는 회의실입니다." },
  BOOKING_OVER_CAPACITY: { category: "VALIDATION_ERROR", message: "회의실 수용 인원을 초과했습니다." },
  BOOKING_PAST_TIME: { category: "VALIDATION_ERROR", message: "지난 시각은 예약할 수 없습니다." },
  BOOKING_TIME_CONFLICT: { category: "CONFLICT", message: "이미 예약된 시간입니다. 다른 시간이나 회의실을 선택해 주세요." },
  BOOKING_EDIT_FORBIDDEN: { category: "FORBIDDEN", message: "본인 예약만 수정할 수 있습니다." },
  BOOKING_CANCEL_FORBIDDEN: { category: "FORBIDDEN", message: "본인 예약만 취소할 수 있습니다." },
  BOOKING_NOT_CONFIRMED: { category: "INVALID_STATE", message: "이미 취소된 예약입니다." },
  BOOKING_ALREADY_STARTED: { category: "INVALID_STATE", message: "이미 시작했거나 끝난 예약은 변경할 수 없습니다." },
  BOOKING_CONCURRENT_MODIFICATION: { category: "INVALID_STATE", message: "다른 사용자가 먼저 변경했습니다. 새로고침해 주세요." },
});
