// [공유] 회의실 관리 오류 계약
import { defineErrors } from "../../lib/error-codes";

export const RoomErrors = defineErrors({
  ROOM_NOT_FOUND: { category: "NOT_FOUND", message: "회의실을 찾을 수 없습니다." },
  ROOM_NAME_DUPLICATE: { category: "CONFLICT", message: "같은 이름의 회의실이 이미 있습니다." },
  ROOM_HAS_UPCOMING_BOOKINGS: { category: "INVALID_STATE", message: "예정된 예약이 있어 비활성화할 수 없습니다. 예약을 먼저 취소해 주세요." },
  ROOM_CAPACITY_BELOW_BOOKINGS: { category: "INVALID_STATE", message: "예정된 예약 인원보다 수용 인원을 줄일 수 없습니다." },
});
