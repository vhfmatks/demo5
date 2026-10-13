// 합성 데이터 시드. 실제 개인정보·사내 데이터 금지 (security-policy).
import bcrypt from "bcryptjs";
import { openDb, type Db } from "../src/server/db/open.ts";
import type { Role } from "../src/lib/roles.ts";
import type { Department } from "../src/lib/departments.ts";
import { auditLogs, bookings, requests, rooms, users } from "../src/server/db/schema.ts";
import { addDays, kstDate, kstToday } from "../src/features/bookings/schema.ts";

export const DEMO_PASSWORD = "Credit!23";

/** 합성 계정·공개 비밀번호를 운영 DB에 넣지 않는다. 명령 진입점(db:seed·db:reset)에서 호출한다. */
export function assertNotProduction() {
  if (process.env.NODE_ENV === "production") throw new Error("NODE_ENV=production 에서는 시드·초기화를 실행하지 않습니다.");
}

export async function seed(db: Db) {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const mk = (email: string, name: string, role: Role, department: Department | null = null) =>
    db.insert(users).values({ email, name, role, department, passwordHash: hash }).returning().get();

  // 부서: user1·user3·manager = 개발팀, user2 = 영업팀 (부서 범위 시험이 이 배치를 쓴다)
  const u1 = await mk("user1@demo.local", "김민수", "USER", "DEV");
  const u2 = await mk("user2@demo.local", "이서연", "USER", "SALES");
  const ap = await mk("approver@demo.local", "박승인", "APPROVER", "PLAN");
  await mk("admin@demo.local", "최관리", "ADMIN");
  await mk("user3@demo.local", "정하늘", "USER", "DEV");
  await mk("auditor@demo.local", "한감사", "AUDITOR");
  await mk("manager@demo.local", "윤부장", "MANAGER", "DEV");

  // 요청 + 처리 이력(감사로그). daysAgo 로 날짜를 분산해 대시보드·결재함·감사로그 화면이 비지 않게 한다.
  type Seed = {
    title: string; category: "EQUIPMENT" | "ACCESS" | "LEAVE" | "ETC"; description?: string; by: typeof u1; daysAgo: number;
    decision?: { action: "approve" | "reject" | "cancel"; note?: string; hoursLater: number };
  };
  const rows: Seed[] = [
    { title: "노트북 교체 요청", category: "EQUIPMENT", description: "배터리 수명 저하", by: u1, daysAgo: 1 },
    { title: "운영 DB 읽기 권한", category: "ACCESS", description: "장애 분석용", by: u1, daysAgo: 6, decision: { action: "approve", note: "1주일 한정", hoursLater: 3 } },
    { title: "연차 신청 (10/20)", category: "LEAVE", by: u2, daysAgo: 2 },
    { title: "모니터 추가", category: "EQUIPMENT", by: u2, daysAgo: 9, decision: { action: "reject", note: "예산 소진", hoursLater: 20 } },
    { title: "사내 위키 편집 권한", category: "ACCESS", description: "온보딩 문서 정리", by: u2, daysAgo: 0 },
    { title: "외부 세미나 참석", category: "ETC", description: "AI 서비스 운영 사례 세미나", by: u1, daysAgo: 3 },
    { title: "반차 신청 (오후)", category: "LEAVE", by: u1, daysAgo: 12, decision: { action: "approve", hoursLater: 1 } },
    { title: "테스트 단말 대여", category: "EQUIPMENT", description: "앱 QA 용 2대", by: u2, daysAgo: 4, decision: { action: "approve", note: "반납일 엄수", hoursLater: 5 } },
    { title: "VPN 계정 발급", category: "ACCESS", by: u1, daysAgo: 8, decision: { action: "cancel", hoursLater: 2 } },
    { title: "회의실 장기 예약", category: "ETC", description: "프로젝트 전담 공간", by: u2, daysAgo: 1 },
  ];
  const STATUS = { approve: "APPROVED", reject: "REJECTED", cancel: "CANCELED" } as const;
  const at = (daysAgo: number, hours = 0) => new Date(Date.now() - daysAgo * 86_400_000 + hours * 3_600_000);
  for (const r of rows) {
    const created = at(r.daysAgo);
    const d = r.decision;
    const row = await db.insert(requests).values({
      title: r.title, category: r.category, description: r.description ?? "", requesterId: r.by.id,
      createdAt: created, updatedAt: d ? at(r.daysAgo, d.hoursLater) : created,
      ...(d ? { status: STATUS[d.action], ...(d.action === "cancel" ? {} : { approverId: ap.id, decisionNote: d.note ?? null }) } : {}),
    }).returning({ id: requests.id }).get();
    await db.insert(auditLogs).values({ actorId: r.by.id, action: "request.create", entity: "request", entityId: row.id, createdAt: created }).run();
    if (d) await db.insert(auditLogs).values({
      actorId: d.action === "cancel" ? r.by.id : ap.id, action: `request.${d.action}`, entity: "request", entityId: row.id,
      detail: { from: "PENDING", to: STATUS[d.action], note: d.note ?? null }, createdAt: at(r.daysAgo, d.hoursLater),
    }).run();
  }

  // 회의실 4개 + 오늘~모레 예약. 타임라인 화면이 비지 않도록 한다.
  const [big, roomA, roomB, focus] = await db.insert(rooms).values([
    { name: "대회의실", location: "본관 5층", capacity: 12 },
    { name: "소회의실 A", location: "본관 3층", capacity: 4 },
    { name: "소회의실 B", location: "본관 3층", capacity: 6 },
    { name: "포커스룸", location: "별관 2층", capacity: 2 },
  ]).returning().all();
  const today = kstToday();
  const bk = (day: number, start: string, end: string, room: typeof big, by: typeof u1, title: string, attendees: number) =>
    ({ roomId: room.id, ownerId: by.id, title, attendees, startAt: kstDate(addDays(today, day), start), endAt: kstDate(addDays(today, day), end) });
  await db.insert(bookings).values([
    bk(0, "09:00", "10:00", big, ap, "주간 업무 회의", 10),
    bk(0, "10:30", "12:00", roomA, u1, "AX 과제 아이디어 회의", 4),
    bk(0, "13:00", "14:00", roomB, u2, "디자인 리뷰", 5),
    bk(0, "14:00", "16:00", big, u1, "고객사 데모 리허설", 8),
    bk(0, "16:30", "17:30", focus, u2, "1:1 면담", 2),
    bk(1, "09:30", "11:00", roomA, u2, "스프린트 계획", 4),
    bk(1, "11:00", "12:00", roomA, u1, "API 설계 검토", 3),
    bk(1, "15:00", "17:00", big, ap, "분기 실적 공유", 12),
    bk(2, "10:00", "11:30", roomB, u1, "보안 점검 회의", 5),
  ]).run();
  console.log("seeded");
}

if (process.argv[1]?.endsWith("db-seed.mts")) {
  assertNotProduction();
  await seed(openDb(process.env.DATABASE_URL ?? "data/dev.db"));
}
