import { Gnb, LinkButton } from "@/components/ui";
import { SettingsNotice } from "@/features/settings/components/SettingsNotice";
import { getSettings } from "@/features/settings/service";

// 공개 화면은 로그인 필수 (app) 그룹과 분리한다. Route Group 이름은 URL에 포함되지 않는다.
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-screen kit-app-frame">
    <Gnb
      items={[{ href: "/publicNotes", label: "공개 메모" }, { href: "/requests", label: "개인 요청" }]}
      actions={<LinkButton href="/login" variant="tertiary" size="small">로그인</LinkButton>}
    />
    <main className="kds-container kit-page-main"><SettingsNotice settings={await getSettings()} />{children}</main>
  </div>;
}
