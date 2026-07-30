// 인증키 로더: 환경변수만 본다. (Vercel 배포 시 대시보드/CLI로 설정한 값)
// 로컬 개발용 config.js 파일 값은 server.js가 시작 시 process.env로 미리 주입한다.
// (여기서 "../config"를 직접 require하면 Vercel 번들러가 빌드 시점에 그 파일을
//  정적으로 찾으려다 실패한다 — try/catch로 감싸도 번들러 단계라 소용없음)
module.exports = {
  EXIM_AUTH_KEY: process.env.EXIM_AUTH_KEY,
  KOTRA_SERVICE_KEY: process.env.KOTRA_SERVICE_KEY,
};
