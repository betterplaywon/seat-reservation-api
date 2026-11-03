import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsService } from './reservations.service';

// TODO [3단계] 컨트롤러 전체를 @UseGuards(JwtAuthGuard) 로 보호하고,
//   각 핸들러에서 @CurrentUser() 로 payload 를 받아 user.sub 를 서비스에 넘긴다.
//   GET /reservations 에는 추가로 @UseGuards(RolesGuard) @Roles('ADMIN').
//   → 가드 두 개의 적용 순서가 바뀌면 무슨 일이 생기는지 확인할 것.

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: '좌석 예약 (인증 필요)' })
  create(@Body() _dto: CreateReservationDto) {
    // return this.reservationsService.create(user.sub, dto);
    throw new NotImplementedException('POST /reservations — 가드/현재사용자 연결 필요');
  }

  @Get('me')
  @ApiOperation({ summary: '내 예약 목록 (인증 필요)' })
  findMine() {
    // return this.reservationsService.findMine(user.sub);
    throw new NotImplementedException('GET /reservations/me');
  }

  // 같은 리소스(/reservations)라도 "누구의 것을 보느냐"에 따라 권한이 다르다. 용어: RBAC, 인가
  @Get()
  @ApiOperation({ summary: '날짜별 전체 예약 현황 (ADMIN 전용)' })
  @ApiQuery({ name: 'date', example: '2026-11-10' })
  findAllByDate(@Query('date') date: string) {
    return this.reservationsService.findAllByDate(date);
  }

  // PATCH vs DELETE: 예약을 지우지 않고 status 를 CANCELLED 로 바꾸므로 PATCH. 용어: 소프트 삭제(soft delete)
  @Patch(':id/cancel')
  @ApiOperation({ summary: '예약 취소 (인증 필요, 본인만)' })
  cancel(@Param('id', ParseIntPipe) _id: number) {
    // return this.reservationsService.cancel(user.sub, id);
    throw new NotImplementedException('PATCH /reservations/:id/cancel');
  }
}
