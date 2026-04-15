import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';
import { CreatePublicInquiryDto } from './dto/create-public-inquiry.dto';

@Injectable()
export class PublicInquiriesService {
  constructor(private readonly prisma: DatabaseService) {}

  async create(payload: CreatePublicInquiryDto) {
    return this.prisma.publicInquiry.create({
      data: {
        name: payload.name,
        email: payload.email,
        message: payload.message,
        phone: payload.phone ?? null,
        packageInterest: payload.packageInterest ?? null,
      },
    });
  }
}
