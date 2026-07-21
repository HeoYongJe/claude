// FTP 접속 테스트: 로그인 후 원격 웹루트 목록을 확인한다.
const ftp = require("basic-ftp");
const cfg = require("../deploy.config.js");

(async () => {
  const client = new ftp.Client(15000);
  try {
    await client.access({ host: cfg.host, port: cfg.port, user: cfg.username, password: cfg.password, secure: false });
    console.log("접속 성공!");
    const list = await client.list(cfg.remoteRoot);
    console.log(`${cfg.remoteRoot} 안 항목 (${list.length}개):`);
    list.forEach((f) => console.log(` - ${f.name}${f.isDirectory ? " [폴더]" : ""}`));
  } catch (err) {
    console.error("접속 실패:", err.message);
    process.exitCode = 1;
  } finally {
    client.close();
  }
})();
