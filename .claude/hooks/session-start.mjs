#!/usr/bin/env node
/* global console, process */
// SessionStart 훅. 작업 상태 몇 줄(브랜치·미커밋·열린 PR·REVIEW 진행·MySQL·최근 보고서)을 컨텍스트에 넣는다 — 세션 인계가 빨라진다.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { git, projectDir, readInput, run } from './_shared.mjs';

const newest = (dir, ext) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(ext))
        .sort()
        .at(-1)
    : undefined;

const input = readInput();
const project = projectDir(input);
const lines = [];

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], project) ?? '?';
const dirty = (git(['status', '--short'], project) ?? '').split('\n').filter(Boolean).length;
lines.push(`[seat-reservation-api] 브랜치 ${branch}, 미커밋 변경 ${dirty}개. 규칙은 CLAUDE.md 와 .claude/rules/, 비자명한 작업은 /pstack:poteto-mode 로 시작.`);

const prs = run('gh', ['pr', 'list', '--state', 'open', '--json', 'number,title,headRefName', '--limit', '10'], { cwd: project, timeout: 8_000 });
if (prs) {
  try {
    const list = JSON.parse(prs);
    lines.push(list.length ? `열린 PR: ${list.map((p) => `#${p.number} ${p.title} (${p.headRefName})`).join(' · ')}` : '열린 PR 없음.');
  } catch {
    // gh 출력이 JSON 이 아니면 건너뛴다.
  }
}

// docs/REVIEW.md 요약의 체크박스로 점검 항목 진행을 센다.
const review = path.join(project, 'docs', 'REVIEW.md');
if (existsSync(review)) {
  const items = readFileSync(review, 'utf8')
    .split('\n')
    .filter((l) => /^- \[[ x]\] /.test(l));
  const open = items.filter((l) => l.startsWith('- [ ] '));
  lines.push(`REVIEW.md: 처리 ${items.length - open.length}/${items.length} · 다음 미처리: ${open[0]?.slice(6) ?? '없음'}`);
}

// 비대화형 셸에는 docker 가 PATH 에 없다.
const docker = [`${process.env.HOME}/.docker/bin/docker`, '/usr/local/bin/docker'].find((p) => existsSync(p)) ?? 'docker';
const state = run(docker, ['inspect', '-f', '{{.State.Status}}{{if .State.Health}} ({{.State.Health.Status}}){{end}}', 'seat-mysql'], { timeout: 5_000 });
lines.push(`MySQL 컨테이너 seat-mysql: ${state ?? '없음 → docker compose up -d --wait'} · 호스트 포트 3307`);

const report = newest(path.join(project, '.audit', 'reports'), '.md');
if (report) lines.push(`최근 보고서: .audit/reports/${report}`);
const trail = newest(path.join(project, '.audit'), '.tsv');
if (trail) lines.push(`결정 기록: .audit/${trail} (column -s$'\\t' -t 로 본다)`);

console.log(lines.join('\n'));
