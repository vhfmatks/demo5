import { Tag, type Tone } from "@/components/ui";
import { STATUS_LABEL, type RequestStatus } from "../schema";

const TONE: Record<RequestStatus, Tone> = { PENDING: "progress", APPROVED: "positive", REJECTED: "critical", CANCELED: "default" };

export const StatusBadge = ({ status }: { status: RequestStatus }) => <Tag tone={TONE[status]} testId="status">{STATUS_LABEL[status]}</Tag>;
