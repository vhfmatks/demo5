# 설계·코드 대조

## arch (G3, foundation 병합 후)

[arch 문서 매뉴얼](../documents/arch.md)만 먼저 읽는다. 검증 영향·REQ/AC 상태까지 바꾸는 경우에만 [라이프사이클](../lifecycle.md)을 추가로 읽는다. 다른 매뉴얼은 그 문서를 실제 수정할 때만 로드한다.

관련 통합 소스 SHA를 확인하고 `docs/arch.md`를 실제 schema·service·API·화면·nav·배포 흐름과 대조한다(여러 파일이면 Explore에 결론·소스 위치만 요청). 선택 이유·실제/mock·권한 경계·재시작/복구·제약을 확인하고 영향 REQ·AC·FLOW·SEC를 연결한다. 변경된 설계와 이유만 부분 반영하며 기능 검증 상태는 실행 근거 없이 올리지 않는다. 승인된 경우에만 관련 문서를 `docs: G3 arch`로 커밋·push한다.
