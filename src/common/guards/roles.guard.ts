// TODO [3단계] 역할 기반 인가 가드 구현.
// 흐름: @Roles('ADMIN') 메타데이터 읽기(Reflector) → request.user.role 과 비교 → 불일치면 ForbiddenException(403)
// 용어: RBAC, 메타데이터, Reflector, 401 vs 403 의 차이
//
// 질문해볼 것: JwtAuthGuard 와 RolesGuard 의 적용 순서가 바뀌면 무슨 일이 생기는가?

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    throw new ForbiddenException('RolesGuard is not implemented yet');
  }
}
