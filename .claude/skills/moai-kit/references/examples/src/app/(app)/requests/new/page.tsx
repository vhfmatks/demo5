import { Card, PageHeader } from "@/components/ui";
import { RequestForm } from "@/features/requests/components/RequestForm";
import { aiAvailable } from "@/features/ai/service";

export default async function NewRequestPage() {
  return (
    <>
      <PageHeader title="새 요청" />
      <Card><RequestForm ai={await aiAvailable()} /></Card>
    </>
  );
}
