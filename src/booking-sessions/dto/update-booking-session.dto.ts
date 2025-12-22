import { PartialType } from '@nestjs/swagger';
import { CreateBookingSessionDto } from './create-booking-session.dto';

export class UpdateBookingSessionDto extends PartialType(
  CreateBookingSessionDto,
) {}
