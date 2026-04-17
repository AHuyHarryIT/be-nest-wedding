import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser, type AuthenticatedUser } from '../auth/get-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiPaginatedResponse } from '../common/decorators/api-response.decorator';
import { ResponseBuilder } from '../common/utils/response-builder.util';
import { AlbumsService } from './albums.service';
import { QueryCustomerAlbumsDto } from './dto/query-customer-albums.dto';

@ApiTags('Customer Albums')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('customer/albums')
export class CustomerAlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Get('private')
  @ApiOperation({
    summary: 'List private albums that belong to the authenticated customer',
  })
  @ApiPaginatedResponse(Object)
  async findPrivate(
    @GetUser() user: AuthenticatedUser,
    @Query() query: QueryCustomerAlbumsDto,
  ) {
    const result = await this.albumsService.findCustomerPrivateAlbums(
      user.userId,
      query,
    );

    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Customer private albums retrieved successfully',
    );
  }
}
