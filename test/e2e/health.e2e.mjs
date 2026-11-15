/* global process, fetch, setTimeout */
// 빌드 산출물(dist/main)을 실제로 띄워 GET /health 를 확인한다. `pnpm build` 뒤에 돌린다.
// DB 가 필요하다: 로컬은 `docker compose up -d --wait`, CI 는 MySQL 서비스 컨테이너. DATABASE_URL 은 환경변수나 로컬 설정 파일에서 온다.
// /health 는 SELECT 1 만 하므로 테이블이 없어도 통과한다. 기능별 시나리오는 이 폴더에 파일을 추가한다.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';

const root = path.resolve(import.meta.dirname, '..', '..');
const port = process.env.E2E_PORT ?? '3011';
const base = `http://localhost:${port}`;
let server;
let log = '';

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server.exitCode !== null)
      throw new Error(`서버가 종료됐다(코드 ${server.exitCode}).\n${log}`);
    try {
      await fetch(`${base}/health`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`서버가 ${timeoutMs}ms 안에 뜨지 않았다.\n${log}`);
}

before(async () => {
  assert.ok(
    existsSync(path.join(root, 'dist', 'main.js')),
    'dist/main.js 가 없다. 먼저 pnpm build',
  );
  server = spawn(process.execPath, ['dist/main'], {
    cwd: root,
    env: { ...process.env, PORT: port },
  });
  server.stdout.on('data', (d) => (log += d));
  server.stderr.on('data', (d) => (log += d));
  await waitForServer(15_000);
});

after(() => {
  server?.kill();
});

test('GET /health 는 200 과 db ok 를 돌려준다', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.db, 'ok', `DB 연결 실패. 컨테이너와 DATABASE_URL 을 확인한다.\n${log}`);
});
