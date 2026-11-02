import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 비밀 키는 브라우저에 넣지 않는다 (Supabase가 브라우저의 secret 키 사용을 차단함)
// 브라우저는 /supabase 로 요청하고, 개발 서버(Node)가 키를 붙여 Supabase로 전달한다
export default defineConfig(({ mode }) => {
  // 세 번째 인자 '' : VITE_ 접두사 없는 변수도 읽음 (설정 파일 안에서만 쓰고 번들에는 안 들어감)
  const env = loadEnv(mode, process.cwd(), '');
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SECRET_KEY;

  const proxy = {
    '/supabase': {
      target: url,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/supabase/, ''),
      configure: (p) => {
        p.on('proxyReq', (req) => {
          req.setHeader('apikey', key);
          req.setHeader('Authorization', `Bearer ${key}`);
          // 브라우저 요청으로 판별되지 않도록 브라우저 헤더를 지운다
          req.removeHeader('origin');
          req.removeHeader('referer');
          req.setHeader('user-agent', 'dummy-products-admin-proxy');
        });
      },
    },
  };

  return {
    plugins: [react()],
    define: { __SUPABASE_CONFIGURED__: JSON.stringify(Boolean(url && key)) },
    // 로컬 전용: 127.0.0.1 에만 열어서 같은 네트워크의 다른 기기에서 접근하지 못하게 한다
    server: { host: '127.0.0.1', port: 5173, proxy: url && key ? proxy : undefined },
  };
});
