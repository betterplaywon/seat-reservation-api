---
name: db-reset
description: 로컬 MySQL 컨테이너의 볼륨을 지우고 처음 상태로 다시 만든 뒤(docker/mysql/init 의 초기화 SQL 재실행) 마이그레이션과 시드를 다시 적용한다. "DB 초기화", "DB 리셋", "처음부터 다시 띄워", "init SQL 다시 적용" 에 쓴다. 로컬 데이터가 모두 사라지므로 사용자가 직접 부를 때만 실행된다.
disable-model-invocation: true
---

# 로컬 DB 초기화

`docker compose down -v` 는 볼륨을 지운다. 로컬 DB 의 모든 데이터(예약·사용자 포함)가 사라진다. 실행 전에 무엇이 지워지는지 한 줄로 알린다. PreToolUse 훅이 `down -v` 에서 한 번 더 확인을 요청하는데, 이것은 정상이다.

## 1. 볼륨 삭제 후 재생성

```bash
export PATH="$HOME/.docker/bin:$PATH"
docker compose down -v
docker compose up -d --wait
docker compose ps
docker compose exec mysql mysql -uapp -papp1234 -e "SHOW GRANTS FOR CURRENT_USER()"
```

마지막 줄에 `GRANT CREATE, DROP, REFERENCES, ALTER ON *.*` 이 보이면 초기화 SQL 이 다시 실행된 것이다.

## 2. 마이그레이션

- `prisma/migrations` 가 **없으면** 여기서 멈추고 사용자에게 알린다. 초기 마이그레이션을 만드는 것(`pnpm prisma:migrate`, 이름 `init`)은 README 1단계의 사용자 작업이다.
- 있으면 적용한다. `migrate deploy` 는 있는 파일만 순서대로 적용하고 질문하지 않는다 (서버에서 쓰는 명령). `migrate dev` 는 스키마 변경을 감지해 새 파일을 만들고 섀도 DB 가 필요하다 (개발 중 명령).

```bash
pnpm exec prisma migrate deploy
```

## 3. 시드

```bash
pnpm db:seed     # 층 2개, 좌석 80개. 멱등이라 여러 번 돌려도 같다
```

`migrate dev` 든 `deploy` 든 시드를 자동으로 돌리지 않는다 (`migrate reset` 만 돌린다).

## 보고

컨테이너 상태, 초기화 SQL 재실행 여부(권한 조회 결과), 적용된 마이그레이션 수, 시드 결과(`seeded 2 floors, 80 seats`), 사용자가 다음에 할 일.
