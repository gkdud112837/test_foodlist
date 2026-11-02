# 상품 관리 페이지 (로컬 전용)

Supabase의 가상 상품 DB를 조회 · 검색 · 추가 · 삭제하는 React(Vite) 페이지. 실습 전용이다.

## 준비

1. Supabase에 `../supabase/schema.sql` → `../supabase/seed.sql` 을 먼저 실행해 둔다
2. `.env.example` 을 `.env.local` 로 복사하고 값을 채운다
   - `SUPABASE_URL`: Supabase 대시보드 → Project Settings → API 의 Project URL
   - `SUPABASE_SECRET_KEY`: API Keys 의 secret 키(`sb_secret_…`). `VITE_` 접두사를 붙이지 않는다
3. 설치 · 실행 (`test/` 폴더 기준 경로. 그 위 폴더에서는 `cd test/docs/dummy/db/admin`)

```bash
cd docs/dummy/db/admin
npm install
npm run dev
```

브라우저에서 http://127.0.0.1:5173 을 연다.

## 기능

| 기능 | 설명 |
| --- | --- |
| 조회 | 왼쪽 목록에서 상품을 고르면 원재료 · 원산지 · 보관 기간 · 금지 사항 · 알레르기 · 안내를 표로 보여 줌 |
| 검색 | 상품명 · 코드 · 설명 · 용량 · 원재료 · 원산지 · 안내 문구에서 찾음 |
| 필터 | 알레르기 주의 여부, 특정 알레르기(함유 · 생산 라인 공유) 제외 |
| 추가 | 기본 정보 + 하위 목록을 입력해 저장. 알레르기 여부는 알레르기 목록으로 자동 결정 |
| 삭제 | 확인 후 삭제. 하위 정보도 cascade로 함께 삭제 |

수정 기능은 없다. 고치려면 Supabase Table Editor를 쓰거나 삭제 후 다시 추가한다.

## Vercel 배포 (선택)

배포본에는 개발 서버가 없으므로 `api/supabase.js` 함수가 프록시를 대신한다 (`vercel.json` 이 `/supabase/*` 를 이 함수로 보냄).

1. Vercel 프로젝트의 Root Directory 를 이 폴더로, Preset 을 Vite 로 둔다
2. Vercel → Settings → Environment Variables 에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD` 를 Secret 으로 넣는다
3. 배포 주소를 열면 비밀번호를 묻는다. `ADMIN_PASSWORD` 가 맞는 요청만 Supabase 로 전달되고, 테이블 API(`rest/v1`) 외 경로는 막는다

## 주의

- secret 키는 RLS를 우회하는 관리자 키다. Supabase는 브라우저에서 secret 키를 쓰면 차단하므로, 브라우저는 `/supabase` 로 요청하고 개발 서버 프록시(`vite.config.js`)가 키를 붙여 전달한다. 키는 브라우저 코드에 들어가지 않는다
- 프록시는 `npm run dev` 에서만 동작한다. `npm run build` 결과물을 따로 띄우면 연결되지 않는다
- 개발 서버는 127.0.0.1 에만 열린다 (같은 네트워크의 다른 기기에서 접근 불가). 프록시가 관리자 권한으로 동작하므로 이 설정을 바꾸지 않는다
- `.env.local` 은 공유하지 않는다
- 추가할 때 하위 정보 저장이 실패하면 방금 넣은 상품을 지워 되돌린다
- 선택지(보관 구분, 온도, 안내 종류 등)는 `src/constants.js` 에 있고 `schema.sql` 의 CHECK와 같아야 한다
