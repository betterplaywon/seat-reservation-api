// DTO(Data Transfer Object): "요청 본문은 이런 모양이어야 한다"를 코드로 선언한 것.
// 용어: DTO, 역직렬화, 검증(validation)
//
// TODO [5단계] class-validator 데코레이터 추가 후 main.ts 에 ValidationPipe 등록.
//   @IsEmail() email, @IsString() @MinLength(8) password, @IsString() @MaxLength(30) name
//   - ValidationPipe 를 등록하기 전까지는 이 데코레이터가 있어도 아무 검증도 일어나지 않는다. 직접 확인해볼 것.

import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  password: string;

  @ApiProperty({ example: '강지원' })
  name: string;
}
