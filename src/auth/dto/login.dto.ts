// TODO [5단계] class-validator 데코레이터 추가 (signup.dto.ts 참고)

import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'password123' })
  password: string;
}
