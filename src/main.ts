// 애플리케이션 진입점. "서버를 띄운다"는 말은 이 파일이 실행되어 포트를 열고 요청을 기다린다는 뜻.
// 용어: 런타임 / 이벤트 루프 / 포트(port) / 부트스트랩(bootstrap)

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

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Server listening on http://localhost:${port} (docs: /docs)`);
}

bootstrap();
