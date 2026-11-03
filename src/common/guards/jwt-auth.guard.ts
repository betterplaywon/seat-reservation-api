// TODO [3단계] JWT 인증 가드 구현.
// 흐름: Authorization: Bearer <token> 헤더 읽기 → 서명 검증 → 페이로드(userId, role)를 request.user 에 붙이기
// 용어: 인증(Authentication) vs 인가(Authorization), JWT 구조(헤더.페이로드.서명), Bearer, 만료(exp)
//
// 힌트
//   - @nestjs/jwt 의 JwtService.verifyAsync 를 사용한다. (pnpm add @nestjs/jwt)
//   - 토큰이 없거나 잘못되면 UnauthorizedException(401).
//   - 가드는 "이 요청을 컨트롤러까지 보낼지"만 결정한다. 사용자 조회 같은 비즈니스 로직은 여기 두지 않는다.
//   - 미들웨어 → 가드 → 인터셉터(전) → 파이프 → 핸들러 → 인터셉터(후) → 예외 필터 순서를 기억할 것.

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // 구현 전에는 일부러 실패시킨다. 가드를 "항상 true" 로 두면 보호가 꺼진 줄도 모르고 지나간다.
    throw new UnauthorizedException('JwtAuthGuard is not implemented yet');
  }
}
