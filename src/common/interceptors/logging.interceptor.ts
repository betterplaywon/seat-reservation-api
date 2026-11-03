// TODO [5단계] 요청 로깅 인터셉터 구현.
// 출력 예: [req-3f9a] POST /reservations 201 42ms
//
// 용어: 인터셉터, RxJS tap, 요청 ID(request id), 구조화 로깅, p95 응답시간
//
// 힌트
//   - 핸들러 실행 전에 시작 시각을 기록하고, next.handle().pipe(tap(...)) 에서 경과 시간을 찍는다.
//   - 요청 ID 는 여기서 만들어 request 에 붙이고, 예외 필터에서도 같은 ID 를 찍으면 로그를 추적할 수 있다.

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle();
  }
}
