import Link from "next/link";
import { Gnb } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { ROLE_LABEL } from "@/lib/roles";
import { can } from "@/lib/permissions";
import { SettingsNotice } from "@/features/settings/components/SettingsNotice";
import { getSettings } from "@/features/settings/service";
import { LogoutButton } from "@/components/app/LogoutButton";
import { NAV } from "./nav";

// (app) 그룹 = 로그인 필수 영역. 공개 페이지는 그룹 밖(app/login 등)에 둔다.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="min-h-screen kit-app-frame">
      <Gnb
        items={[
          ...NAV,
          ...(can(user, "request.decide") ? [{ href: "/approvals", label: "결재함" }] : []),
        ]}
        actions={<>
          <Link href="/me" data-testid="current-user" className="body-small-medium text-muted no-underline hover:underline">{user.name} · {ROLE_LABEL[user.role]}</Link>
          <LogoutButton />
        </>}
      />
      <main className="kds-container kit-page-main"><SettingsNotice settings={await getSettings()} />{children}</main>
    </div>
  );
}
