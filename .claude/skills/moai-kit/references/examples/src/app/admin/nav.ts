// 관리자 포털 메뉴. 새 관리 화면 = src/app/admin/<x>/page.tsx (requirePermission("<권한>")) + 아래 한 줄.
// permission 이 없는 메뉴는 보이지 않는다 (화면·API 도 같은 권한으로 막혀 있어야 한다).
import type { Permission } from "@/lib/permissions";

export const ADMIN_NAV: { href: string; label: string; permission: Permission }[] = [
  { href: "/admin", label: "개요", permission: "admin.access" },
  { href: "/admin/users", label: "사용자", permission: "user.read" },
  { href: "/admin/rooms", label: "회의실", permission: "room.manage" },
  { href: "/admin/roles", label: "역할·권한", permission: "admin.access" },
  { href: "/admin/audit", label: "감사로그", permission: "audit.read" },
  { href: "/admin/settings", label: "설정", permission: "settings.read" },
  { href: "/admin/ai", label: "AI", permission: "ai.manage" },
];
