// TODO [5단계] @IsInt() @Min(1) seatId, @Matches(/^\d{4}-\d{2}-\d{2}$/) date 추가.
//   - 형식 검증(DTO)과 의미 검증(실존하는 날짜인가, 예약 가능 범위인가 → 서비스)을 어디서 나눌지 정하고 이유를 적을 것.
//   - 용어: DTO, 역직렬화, 검증(validation), 400 vs 422

import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ example: 1 })
  seatId: number;

  @ApiProperty({ example: '2026-11-10', description: 'YYYY-MM-DD. 오늘(Asia/Seoul)부터 RESERVATION_WINDOW_DAYS 일 이내' })
  date: string;
}
