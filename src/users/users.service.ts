// 사용자 조회/생성. 비즈니스 로직은 서비스에, HTTP 처리는 컨트롤러에.
// 용어: 레이어드 아키텍처(Controller → Service → Repository/ORM)

import { Injectable, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO [3단계] 이메일로 사용자 찾기. 없으면 null.
  async findByEmail(_email: string) {
    throw new NotImplementedException('UsersService.findByEmail');
  }

  // TODO [3단계] id 로 사용자 찾기. passwordHash 는 응답에 포함하지 않도록 select 로 제한할 것.
  //   용어: 과다 노출(over-fetching), select vs include
  async findById(_id: number) {
    throw new NotImplementedException('UsersService.findById');
  }

  // TODO [3단계] 사용자 생성. 이미 해싱된 비밀번호를 받는다 (해싱은 AuthService 책임).
  //   - 이메일 중복 시 Prisma 가 P2002 에러를 던진다. 409 Conflict 로 바꿔서 던질 것.
  async create(_input: { email: string; passwordHash: string; name: string }) {
    throw new NotImplementedException('UsersService.create');
  }
}
