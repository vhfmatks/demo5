// [공유] 공개 CRUD: 로그인·소유자 검사 없이 모든 사용자가 같은 데이터를 관리한다.
export const PUBLIC_ACCESS: Readonly<Record<"read" | "create" | "update" | "delete", boolean>> = Object.freeze({
  read: true,
  create: true,
  update: true,
  delete: true,
});

export const canView = () => PUBLIC_ACCESS.read;
export const canCreate = () => PUBLIC_ACCESS.create;
export const canEdit = () => PUBLIC_ACCESS.update;
export const canDelete = () => PUBLIC_ACCESS.delete;
