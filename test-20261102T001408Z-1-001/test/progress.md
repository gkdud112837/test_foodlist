# 진행 기록

## 2026-11-02

- `research/qa_dummy_questions.md` 문서 정답 10개 채움 (근거: `docs/dummy/products/`)
- 가상 상품 10건 SQLite DB 생성: `docs/dummy/db/` (스크립트 · DB · README)
  - 테이블 4개: products 10행, care_rules 26행, allergy_info 13행, shipping_policy 1행
- DB 재설계: 신선 식품 배송 규칙 제거, 정보 유형별 하위 테이블 10개로 분리 (NULL 0개)
  - 서문시장 납작만두 원산지를 "대구 서문시장"으로 추정해 넣었던 것 삭제 (문서에 원산지 없음)
  - 문서에 없는 정보는 채우지 않음 (가상 데이터 + 실습의 "문서에 없음" 질문 보존)
- Supabase용 SQL 작성: `docs/dummy/db/supabase/` (schema.sql · seed.sql · make_seed.py)
  - PGlite(PostgreSQL)로 schema → seed 실행 검증 완료. 실제 Supabase 프로젝트에는 아직 안 올림
- 로컬 전용 상품 관리 페이지(React + Vite): `docs/dummy/db/admin/`
  - 조회 · 검색 · 필터 · 추가 · 삭제. 수정 기능 없음
  - `npm run build` 통과
  - secret 키(`sb_secret_…`)는 브라우저에서 차단돼 개발 서버 프록시로 변경. 프록시 경유 조회 확인 완료 (추가 · 삭제는 아직)

## 다음 할 일

### 지금 바로 (사용자)

- [ ] Supabase SQL Editor에서 `docs/dummy/db/supabase/schema.sql` → `seed.sql` 순서로 실행
- [ ] 올린 뒤 anon 키로 읽기 확인 (예: `products` 조회). RLS 읽기 정책은 로컬에서 검증 못 함
- [ ] `docs/dummy/db/admin/.env.local` 작성 후 `npm run dev`로 관리 페이지 동작 확인 (조회 → 추가 → 삭제)
- [ ] 데이터 원본 결정: Supabase만 쓸지, `build_products_db.py`를 원본으로 두고 seed를 다시 만들지
  - Supabase만 쓰면 SQLite 파일(`products.db`, `build_products_db.py`) 정리

### 실습 본 작업 (RAG 적용 전 · 후 비교)

- [ ] A(적용 전): `research/qa_dummy_questions.md`만 보고 일반 지식으로 답 → `research/qa_dummy_A.md`
- [ ] B(적용 후)의 검색 방식 결정: 문서 RAG / 에이전틱 검색 / Supabase 조회 중 무엇으로 할지
- [ ] B(적용 후): 정한 방식으로 답 → `research/qa_dummy_B.md`
- [ ] A · B를 문서 정답과 비교해 채점 → `modeling/metrics.md`
  - 특히 6 · 7번(함정)과 8~10번(문서에 없음)에서 "모른다"고 답했는지 확인

### 보류

- [ ] 문서에 없는 정보(만두 원산지, 유통기한 등)를 "임의 값" 표시를 붙여 채울지 결정. 기본은 채우지 않음
