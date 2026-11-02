import { createClient } from '@supabase/supabase-js';

// 실제 주소와 키는 개발 서버 프록시(vite.config.js)가 붙인다. 브라우저에는 키가 없다
// __SUPABASE_CONFIGURED__ 는 vite.config.js 의 define 으로 주입됨
export const configError = __SUPABASE_CONFIGURED__
  ? null
  : '.env.local 에 SUPABASE_URL 과 SUPABASE_SECRET_KEY 를 설정하고 npm run dev 를 다시 실행하세요';

// supabase-js 는 키 값이 비어 있으면 안 되므로 자리표시 값을 넘긴다 (프록시가 진짜 키로 덮어씀)
export const supabase = configError
  ? null
  : createClient(`${window.location.origin}/supabase`, 'set-by-proxy', { auth: { persistSession: false } });
