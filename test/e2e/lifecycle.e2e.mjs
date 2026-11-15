/* global process, fetch, setTimeout, clearTimeout */
// 프로세스의 시작과 끝을 확인한다: 부팅 실패와 종료 신호(SIGTERM·SIGINT). docs/REVIEW.md 6번.
// 서버를 일부러 죽이는 테스트라서 테스트마다 dist/main 을 따로 띄운다.
// `pnpm build` 뒤에 돌리고 DB 가 필요하다 (health.e2e.mjs 와 같다).
// 포트는 운영체제가 골라 주는 빈 포트를 쓴다. health.e2e.mjs 의 3011 과 겹치지 않는다.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { before, test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';

const root = path.resolve(import.meta.dirname, '..', '..');

// dist/main 을 주어진 포트로 띄운다. 서버가 찍은 로그는 log() 로 꺼내 본다.
function startApp(port) {
  let output = '';
  const child = spawn(process.execPath, ['dist/main'], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
  });
  child.stdout.on('data', (d) => (output += d));
  child.stderr.on('data', (d) => (output += d));
  return { child, log: () => output };
}

// 포트 0 으로 열면 운영체제가 비어 있는 포트를 골라 준다. 고른 번호는 server.address().port.
async function listenOnFreePort() {
  const server = net.createServer().listen(0);
  await once(server, 'listening');
  return server;
}

// promise 가 ms 안에 끝나지 않으면 실패시킨다. 서버가 멈춰도 테스트가 끝없이 기다리지 않는다.
function within(ms, promise, what) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what}: ${ms}ms 안에 끝나지 않았다`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// 서버가 요청을 받기 시작할 때까지 기다린다.
async function waitUntilUp(port, app) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    assert.equal(app.child.exitCode, null, `서버가 뜨다가 종료됐다.\n${app.log()}`);
    try {
      await fetch(`http://localhost:${port}/health`);
      return;
    } catch {
      await sleep(200);
    }
  }
  assert.fail(`서버가 15초 안에 뜨지 않았다.\n${app.log()}`);
}

before(() => {
  assert.ok(
    existsSync(path.join(root, 'dist', 'main.js')),
    'dist/main.js 가 없다. 먼저 pnpm build',
  );
});

test('부팅에 실패하면 원인을 로그에 남기고 종료 코드 1 로 끝난다', async () => {
  // 테스트가 포트를 먼저 차지한다. 앱은 같은 포트를 열지 못해 부팅에 실패한다 (EADDRINUSE).
  const blocker = await listenOnFreePort();
  const app = startApp(blocker.address().port);
  try {
    const [code] = await within(15_000, once(app.child, 'close'), '부팅 실패 뒤 종료');
    assert.equal(code, 1, app.log());
    assert.match(app.log(), /bootstrap failed/);
    assert.match(app.log(), /EADDRINUSE/);
  } finally {
    app.child.kill('SIGKILL'); // 이미 끝났으면 아무 일도 하지 않는다
    blocker.close();
  }
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  test(`${signal} 을 받으면 처리 중이던 요청에 응답한 뒤 끝난다`, async () => {
    const probe = await listenOnFreePort();
    const { port } = probe.address();
    probe.close();
    await once(probe, 'close');

    const app = startApp(port);
    const socket = new net.Socket();
    let response = '';
    socket.on('data', (d) => (response += d));
    socket.on('error', () => {}); // 서버가 먼저 죽으면 연결 오류가 난다. 판정은 아래 assert 가 한다.
    try {
      await waitUntilUp(port, app);

      // 요청을 절반만 보낸다. 헤더의 끝을 알리는 빈 줄이 아직 없어서
      // 서버는 이 요청을 "처리 중"으로 본다.
      socket.connect(port, 'localhost');
      await once(socket, 'connect');
      socket.write('GET /health HTTP/1.1\r\nHost: localhost\r\n');
      // 다른 요청이 한 번 오갈 때까지 기다린다. 그 사이에 서버는 위의 반쪽 요청도 받는다.
      await fetch(`http://localhost:${port}/health`);

      app.child.kill(signal);
      await sleep(300); // 서버가 시그널을 처리할 시간
      assert.equal(
        app.child.exitCode ?? app.child.signalCode,
        null,
        `처리 중인 요청이 있는데 서버가 먼저 끝났다.\n${app.log()}`,
      );

      socket.write('Connection: close\r\n\r\n'); // 나머지를 보내 요청을 끝낸다
      await within(10_000, once(socket, 'close'), '응답');
      const [, endedBy] = await within(10_000, once(app.child, 'close'), '서버 종료');

      assert.match(response, /^HTTP\/1\.1 200 OK/, `응답: ${response}\n${app.log()}`);
      assert.match(response, /"db":"ok"/, `응답: ${response}`);
      // Nest 는 정리를 마친 뒤 받은 시그널을 자신에게 다시 보내 끝낸다.
      // 그래서 종료 코드가 아니라 시그널 이름이 남는다.
      assert.equal(endedBy, signal, app.log());
    } finally {
      socket.destroy();
      app.child.kill('SIGKILL'); // 이미 끝났으면 아무 일도 하지 않는다
    }
  });
}
