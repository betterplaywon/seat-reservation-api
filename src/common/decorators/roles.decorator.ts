// 핸들러에 "허용 역할" 메타데이터를 붙이는 데코레이터. RolesGuard 가 이 값을 읽는다.
// 용어: 데코레이터, 메타데이터, SetMetadata
//
// 사용: @Roles('ADMIN')

import { SetMetadata } from '@nestjs/common';

// schema.prisma 의 enum Role 과 같은 값. 생성된 Prisma 타입(`import { Role } from '@prisma/client'`)을
// 써도 되지만, common/ 레이어가 ORM 에 의존하지 않도록 여기서는 분리해두었다.
export type AppRole = 'USER' | 'ADMIN';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
