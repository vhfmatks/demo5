// [공유] 회의실 관리(관리자) — 입력·DTO. 예약 쪽 조회용 RoomDto 는 features/bookings/schema.ts.
// 주의: "@/" 별칭 금지, server-only 금지
import { z } from "zod";

const RoomFields = {
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이하"),
  location: z.string().trim().max(100, "100자 이하"),
  capacity: z.coerce.number({ error: "숫자를 입력해 주세요." }).int("정수로 입력해 주세요.").min(1, "1명 이상").max(100, "100명 이하"),
};
export const CreateRoomInput = z.strictObject({ ...RoomFields, location: RoomFields.location.default("") });
export type CreateRoomInput = z.infer<typeof CreateRoomInput>;

export const UpdateRoomInput = z.strictObject({ ...RoomFields, active: z.boolean({ error: "사용 여부는 true/false" }) }).partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: "수정할 항목을 하나 이상 입력해 주세요." },
);
export type UpdateRoomInput = z.infer<typeof UpdateRoomInput>;

export type AdminRoomDto = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  active: boolean;
  upcomingBookings: number; // 지금 이후 끝나는 확정 예약 수
  createdAt: string;
};
