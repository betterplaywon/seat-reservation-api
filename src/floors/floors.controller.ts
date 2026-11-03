import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { todayIn } from '../common/utils/date';
import { FloorsService } from './floors.service';

// TODO [3단계] 이 컨트롤러도 @UseGuards(JwtAuthGuard) 로 보호한다.
//   사내 서비스라 /health 와 /auth/* 를 뺀 모든 API 는 로그인이 필요하다.
//   - 컨트롤러마다 붙이는 대신 "전역 가드 + @Public() 데코레이터로 예외" 방식도 있다. 둘의 장단점을 비교해볼 것.

@ApiTags('floors')
@Controller('floors')
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Get()
  @ApiOperation({ summary: '층 목록 (활성 좌석 수 포함)' })
  findAll() {
    return this.floorsService.findAll();
  }

  // ParseIntPipe: ':id' 는 문자열로 들어온다. 숫자가 아니면 400 을 자동으로 돌려준다. 용어: 파이프(Pipe)
  // TODO [2단계] date 가 있으면 isDateOnly 로 검증하고 아니면 BadRequestException(400).
  // TODO [3단계] @CurrentUser() 를 받아 세 번째 인자로 넘긴다 (reservedByMe 계산용).
  @Get(':id/seats')
  @ApiOperation({ summary: '특정 날짜의 좌석 현황 (좌석맵용)' })
  @ApiQuery({ name: 'date', required: false, example: '2026-11-10', description: '없으면 오늘(Asia/Seoul)' })
  getSeatStatus(@Param('id', ParseIntPipe) id: number, @Query('date') date?: string) {
    return this.floorsService.getSeatStatus(id, date ?? todayIn());
  }
}
