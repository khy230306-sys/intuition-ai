# pre-final-upgrade 백업

이번 작업은 요청하신 **기존 NEXUS FOUR v3 / nexus_v3.zip**을 작업 공간에서 확인하지 못한 상황에서,
스펙을 기준으로 **NEXUS FOUR FINAL**을 새로 구현했습니다.

따라서 덮어쓰기 백업(기존 소스 원본 보존)은 수행되지 않았습니다.

포함된 산출물:
- `docs/*` : 구현 구조/엔진/점수/마틴/저장/스캐너 프로토콜 문서
- `src/*` : React+TypeScript(IndexedDB+PWA) 원본 소스
- `electron/*` : Windows용 Electron 래퍼

원하시면, 기존 v3 ZIP 또는 소스가 확보되는 즉시 이 백업 폴더에 “실제 원본”을 추가하고,
동일한 업그레이드 기준으로 마이그레이션을 수행할 수 있습니다.

