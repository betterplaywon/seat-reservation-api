// 회원가입 / 로그인.
// 용어: 해싱 vs 암호화, 솔트, bcrypt 의 cost factor, JWT 발급(sign) / 검증(verify), 액세스 토큰

import { Injectable, NotImplementedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  // TODO [3단계] 회원가입.
  //   1. bcrypt.hash(password, 10) 로 해싱 → 10 이 무엇을 뜻하는지, 왜 너무 크면 안 되는지 확인
  //   2. usersService.create 호출
  //   3. 응답에는 passwordHash 를 절대 포함하지 않는다
  async signup(_dto: SignupDto) {
    throw new NotImplementedException('AuthService.signup');
  }

  // TODO [3단계] 로그인.
  //   1. 이메일로 사용자 조회
  //   2. bcrypt.compare(password, user.passwordHash)
  //   3. 실패 시 "이메일이 없음"과 "비밀번호 틀림"을 구분하지 않고 같은 401 메시지를 준다 → 왜?
  //   4. 성공 시 { accessToken } 반환. payload 는 { sub: user.id, role: user.role } 만.
  //      → 페이로드는 서명만 될 뿐 암호화되지 않는다. 민감 정보를 넣으면 안 되는 이유.
  async login(_dto: LoginDto): Promise<{ accessToken: string }> {
    throw new NotImplementedException('AuthService.login');
  }
}
