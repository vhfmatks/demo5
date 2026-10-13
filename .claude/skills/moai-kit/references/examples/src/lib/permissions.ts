// [공유] RBAC 단일 기준. 코드는 역할이 아니라 "권한"을 검사한다 → 역할 구성이 바뀌어도 검사 코드는 그대로.
//  - 권한 = 행위 단위 (<자원>.<행위>[.<범위>]). 화면·API·서비스 모두 같은 키를 쓴다.
//  - 역할 = 권한 묶음. 상위 역할은 inherits 로 하위 역할 권한을 물려받는다.
//  - 기본 거부: 여기 없는 권한·역할·비로그인은 모두 false.
//  - 소유자·상태 같은 자원별 조건(ABAC)은 각 features/<x>/policy.ts 에서 권한과 함께 판단한다.
// 서버·클라이언트 공용 (클라이언트는 표시용, 강제는 서버 service).
import type { Role } from "./roles";

export const PERMISSIONS = {
  "request.read.all": "모든 요청 조회",
  "request.read.dept": "같은 부서 요청 조회",
  "request.decide": "요청 승인·반려 (본인 요청 제외)",
  "request.delete.any": "모든 요청 삭제",
  "booking.cancel.any": "다른 사람 예약 취소",
  "room.manage": "회의실 등록·수정·비활성화",
  "admin.access": "관리자 포털 접근",
  "user.read": "사용자 목록 조회",
  "user.role.update": "사용자 역할 변경 (본인 제외)",
  "user.department.update": "사용자 부서 지정",
  "audit.read": "감사로그 조회",
  "settings.read": "운영 설정 조회",
  "settings.update": "운영 설정 변경",
  "maintenance.bypass": "점검 모드 중 쓰기",
  "ai.manage": "AI 공급자·모델 등록·시험",
  // @gen:permissions — `npm run gen` 이 이 줄 위에 기능별 권한을 추가한다. 지우지 말 것.
} as const;
export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

/** 역할 정의. ADMIN 은 모든 권한(새 권한도 자동 포함). 그 외는 필요한 것만 명시(최소 권한). */
export const ROLE_DEFINITIONS: Record<Role, { description: string; inherits?: Role; grants: readonly Permission[] | "ALL" }> = {
  USER: { description: "본인 요청·예약을 관리합니다.", grants: [] },
  MANAGER: {
    description: "같은 부서 구성원의 데이터를 조회합니다(기능별 <x>.read.dept).",
    inherits: "USER",
    grants: [
      "request.read.dept",
      // @gen:dept-grants — `npm run gen` 이 이 줄 위에 기능별 같은 부서 조회 권한을 추가한다. 지우지 말 것.
    ],
  },
  APPROVER: { description: "다른 사람의 요청을 조회하고 승인·반려합니다.", inherits: "USER", grants: ["request.read.all", "request.decide"] },
  AUDITOR: { description: "관리자 포털에서 감사로그만 조회합니다.", inherits: "USER", grants: ["admin.access", "audit.read"] },
  ADMIN: { description: "모든 권한을 가집니다.", grants: "ALL" },
};

function resolve(role: Role, seen: Role[] = []): Set<Permission> {
  if (seen.includes(role)) throw new Error(`역할 상속 순환: ${[...seen, role].join(" → ")}`);
  const def = ROLE_DEFINITIONS[role];
  const own = def.grants === "ALL" ? PERMISSION_KEYS : def.grants;
  return new Set([...(def.inherits ? resolve(def.inherits, [...seen, role]) : []), ...own]);
}

/** 역할별 최종 권한 (모듈 로드 시 1회 계산) */
export const ROLE_PERMISSIONS = {} as Record<Role, ReadonlySet<Permission>>;
for (const r of Object.keys(ROLE_DEFINITIONS) as Role[]) ROLE_PERMISSIONS[r] = resolve(r);

/** 권한 확인. 비로그인·알 수 없는 역할은 false (기본 거부). */
export const can = (actor: { role: Role } | null | undefined, permission: Permission): boolean =>
  !!actor && (ROLE_PERMISSIONS[actor.role]?.has(permission) ?? false);
