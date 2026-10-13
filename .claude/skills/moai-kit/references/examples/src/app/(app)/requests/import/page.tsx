// 가져오기 [Server] — 폼은 공용 ImportForm(Client)
import { Card, PageHeader } from "@/components/ui";
import { ImportForm } from "@/components/app/ImportForm";
import { requireUser } from "@/server/auth/session";
import { IMPORT_HEADERS } from "@/features/requests/service";

export default async function RequestImportPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="요청 가져오기" description="엑셀(.xlsx)·CSV 의 각 행을 대기 상태 요청으로 등록합니다. 분류는 이름(장비) 또는 코드(EQUIPMENT)." />
      <Card>
        <ImportForm url="/api/v1/requests/import" headers={IMPORT_HEADERS} filename="요청_양식.csv" />
      </Card>
    </>
  );
}
