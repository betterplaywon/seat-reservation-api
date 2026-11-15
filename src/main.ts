// 애플리케이션 진입점. "서버를 띄운다"는 말은 이 파일이 실행되어 포트를 열고 요청을 기다린다는 뜻.
// 용어: 런타임 / 이벤트 루프 / 포트(port) / 부트스트랩(bootstrap)

import { ShutdownSignal } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // TODO [5단계] 전역 ValidationPipe 등록.
  //   app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  //   - whitelist / forbidNonWhitelisted / transform 각 옵션이 무엇을 막고 무엇을 바꾸는지 확인할 것.
  //   - 용어: DTO, 직렬화/역직렬화, 파이프(Pipe)

  // TODO [5단계] 전역 예외 필터 등록 → src/common/filters/http-exception.filter.ts 구현 후
  //   app.useGlobalFilters(new HttpExceptionFilter());

  // TODO [5단계] 요청 로깅 인터셉터 등록 → src/common/interceptors/logging.interceptor.ts 구현 후
  //   app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger: 프론트 대신 이 UI로 API를 호출하며 개발한다. http://localhost:3000/docs
  const config = new DocumentBuilder()
    .setTitle('Seat Reservation API')
    .setDescription('사내 좌석 예약 API (가상 회사 Gapsang Korea). 규칙은 docs/DOMAIN.md 참고')
    .setVersion('0.1.0')
    .addBearerAuth() // 용어: Bearer 토큰, Authorization 헤더
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // 종료 요청 시그널을 받으면 바로 죽지 않고 정리부터 한다 (docs/REVIEW.md 6번).
  //   - SIGINT 는 Ctrl+C, SIGTERM 은 `docker stop` 이나 배포 도구가 보낸다.
  //   - 순서: 종료 훅 실행 → 새 연결 거절 → 처리 중인 요청에 응답 → 종료.
  //     종료 훅에서 PrismaService.onModuleDestroy 가 $disconnect 를 부른다.
  //   - 처리 중인 요청은 끝날 때까지 기다린다. 끝나지 않으면 Ctrl+\ (SIGQUIT) 로 바로 끝낸다.
  //   - 인자를 비우면 SIGSEGV 같은 "고장" 시그널과 SIGQUIT 까지 가로챈다.
  //     그러면 실제로 고장 났을 때 죽지 않고 멈추고, Ctrl+\ 도 듣지 않는다. 그래서 둘만 적는다.
  // 용어: 시그널(signal) / 우아한 종료(graceful shutdown)
  app.enableShutdownHooks([ShutdownSignal.SIGTERM, ShutdownSignal.SIGINT]);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Server listening on http://localhost:${port} (docs: /docs)`);
}

// 부팅 실패(DB 접속 불가, 포트 충돌 등)는 원인을 로그에 남기고 종료 코드 1 로 끝낸다.
// .catch 가 없으면 Node 의 기본 동작에 맡기게 된다. `--unhandled-rejections=warn` 옵션이나
// unhandledRejection 리스너가 있으면 부팅에 실패해도 종료 코드가 0 이 된다.
// 용어: 종료 코드(exit code. 0 은 성공, 그 외는 실패)
bootstrap().catch((err) => {
  console.error('bootstrap failed', err);
  process.exit(1);
});
