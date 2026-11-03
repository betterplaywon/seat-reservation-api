// TODO [5단계] 전역 예외 필터 구현. 모든 에러 응답을 같은 모양으로 만든다.
// 목표 응답 형태:
//   { statusCode: 409, error: 'Conflict', message: '이미 예약된 시간입니다', path: '/reservations', timestamp: '...' }
//
// 용어: 예외 필터, HTTP 상태코드(400/401/403/404/409/422/500 을 각각 언제 쓰는지), 구조화 로깅
//
// 질문해볼 것
//   - HttpException 이 아닌 에러(예: Prisma 에러, TypeError)는 어떻게 처리할까? 500 으로 감싸되 내부 메시지는 숨겨야 한다.
//   - Prisma 의 P2002(유니크 제약 위반) 에러를 409 로 바꿔주는 건 여기서 할까, 서비스에서 할까?

import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // 구현 전까지는 등록하지 말 것 (main.ts 의 TODO 참고). 등록하면 모든 응답이 멈춘다.
    const _isHttp = exception instanceof HttpException;
    const _ctx = host.switchToHttp();
    throw exception;
  }
}
