// 상단 메뉴. `npm run gen` 이 마커 위에 항목을 추가한다.
export const NAV: { href: string; label: string }[] = [
  { href: "/", label: "대시보드" },
  { href: "/requests", label: "요청" },
  { href: "/publicNotes", label: "공개 메모" },
  { href: "/bookings", label: "회의실 예약" },
  // @gen:nav
];
