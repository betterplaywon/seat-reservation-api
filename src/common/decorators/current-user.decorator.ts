// TODO [3단계] request.user 를 꺼내주는 파라미터 데코레이터.
// 사용: findMine(@CurrentUser() user: JwtPayload)
// 용어: 파라미터 데코레이터, ExecutionContext, request 객체
//
// 힌트: createParamDecorator((data, ctx) => ctx.switchToHttp().getRequest().user)

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: number; // 용어: sub(subject) = 토큰의 주체. 여기서는 user.id
  role: 'USER' | 'ADMIN';
}

export const CurrentUser = createParamDecorator((_data: unknown, _ctx: ExecutionContext) => {
  throw new Error('CurrentUser decorator is not implemented yet');
});
