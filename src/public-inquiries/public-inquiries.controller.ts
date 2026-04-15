import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/auth/public.decorator';
import { ResponseBuilder } from '@/common';
import { CreatePublicInquiryDto } from './dto/create-public-inquiry.dto';
import { PublicInquiriesService } from './public-inquiries.service';

@ApiTags('Public Inquiries')
@Controller('public-inquiries')
export class PublicInquiriesController {
  constructor(
    private readonly publicInquiriesService: PublicInquiriesService,
  ) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit a public inquiry' })
  async create(@Body() payload: CreatePublicInquiryDto) {
    const inquiry = await this.publicInquiriesService.create(payload);

    return ResponseBuilder.created(
      inquiry,
      'Public inquiry submitted successfully',
    );
  }
}
