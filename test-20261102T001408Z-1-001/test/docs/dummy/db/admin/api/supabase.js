import { createHash, timingSafeEqual } from 'node:crypto';

// Vercel 배포용 프록시. 로컬의 vite.config.js 프록시와 같은 역할 (브라우저 → /supabase → Supabase)
// 조회(GET, HEAD)는 누구나 가능. 추가·삭제는 배포 주소를 아는 누구나 할 수 없도록 ADMIN_PASSWORD 가 맞을 때만 전달한다
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const password = process.env.ADMIN_PASSWORD;

// 브라우저에서 받아 Supabase로 넘길 헤더 / Supabase 응답에서 돌려줄 헤더 (count 결과는 content-range)
const FORWARD_REQ = ['content-type', 'accept', 'prefer', 'range', 'accept-profile', 'content-profile', 'x-client-info'];
const FORWARD_RES = ['content-type', 'content-range', 'preference-applied'];

const sha = (s) => createHash('sha256').update(s).digest();

// 길이가 달라도 비교 시간이 같도록 해시끼리 비교한다
function passwordOk(given) {
  return Boolean(password && given) && timingSafeEqual(sha(given), sha(password));
}

async function handle(request) {
  if (!url || !key || !password) {
    // 비밀번호가 설정되지 않았으면 조회도 막는다 (실수로 설정을 빠뜨린 배포를 열어 두지 않기 위해)
    return Response.json(
      { message: 'Vercel 환경변수 SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_PASSWORD 를 설정하세요' },
      { status: 500 },
    );
  }
  const isRead = ['GET', 'HEAD'].includes(request.method);
  if (!isRead && !passwordOk(request.headers.get('x-admin-password'))) {
    return Response.json({ message: '비밀번호가 맞지 않습니다' }, { status: 401 });
  }

  // vercel.json 이 /supabase/<경로> 를 ?__path=<경로> 로 넘긴다
  const incoming = new URL(request.url);
  const path = incoming.searchParams.get('__path') ?? incoming.pathname.replace(/^\/supabase\//, '');
  incoming.searchParams.delete('__path');
  // 테이블 API(PostgREST)만 허용. 인증 관리 등 다른 Supabase API는 막는다
  if (!/^rest\/v1\//.test(path)) {
    return Response.json({ message: '허용되지 않는 경로입니다' }, { status: 404 });
  }

  const headers = new Headers();
  for (const h of FORWARD_REQ) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set('apikey', key);
  headers.set('authorization', `Bearer ${key}`);
  headers.set('user-agent', 'dummy-products-admin-proxy');

  const upstream = await fetch(`${url.replace(/\/$/, '')}/${path}${incoming.search}`, {
    method: request.method,
    headers,
    body: isRead ? undefined : await request.arrayBuffer(),
  });

  const out = new Headers();
  for (const h of FORWARD_RES) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE, handle as HEAD };
