import { createClient } from '@supabase/supabase-js';

// 실제 주소와 키는 프록시가 붙인다. 브라우저에는 키가 없다
// - 로컬(npm run dev): vite.config.js 의 개발 서버 프록시
// - Vercel 배포: api/supabase.js 함수. 조회는 바로, 추가·삭제는 비밀번호(ADMIN_PASSWORD)를 확인한 뒤에 전달한다
// __SUPABASE_CONFIGURED__ 는 vite.config.js 의 define 으로 주입됨
export const configError = __SUPABASE_CONFIGURED__
  ? null
  : '.env.local 에 SUPABASE_URL 과 SUPABASE_SECRET_KEY 를 설정하고 npm run dev 를 다시 실행하세요';

// 배포본(빌드 결과)에서 추가·삭제할 때만 비밀번호를 묻는다
const requiresPassword = import.meta.env.PROD;

const STORAGE_KEY = 'admin-password';
let adminPassword = readStored();

function readStored() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

// 탭을 닫으면 지워지도록 sessionStorage 에 둔다
function setAdminPassword(value) {
  adminPassword = value;
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, value);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장이 막힌 브라우저에서는 이 탭 메모리에만 둔다
  }
}

// 쓰기 요청에 비밀번호 헤더를 붙인다. 처음이면 묻고, 401 이면 지워서 다음에 다시 묻는다
async function fetchWithPassword(input, init = {}) {
  const isWrite = !['GET', 'HEAD'].includes((init.method ?? 'GET').toUpperCase());
  if (!requiresPassword || !isWrite) return fetch(input, init);

  if (!adminPassword) setAdminPassword(window.prompt('추가·삭제하려면 관리자 비밀번호를 입력하세요') ?? '');
  const headers = new Headers(init.headers);
  headers.set('x-admin-password', adminPassword);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) setAdminPassword('');
  return res;
}

// supabase-js 는 키 값이 비어 있으면 안 되므로 자리표시 값을 넘긴다 (프록시가 진짜 키로 덮어씀)
export const supabase = configError
  ? null
  : createClient(`${window.location.origin}/supabase`, 'set-by-proxy', {
      auth: { persistSession: false },
      global: { fetch: fetchWithPassword },
    });
