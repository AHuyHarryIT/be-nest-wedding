import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiExtraModels } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import {
  ResponseBuilder,
  ApiCreatedSuccessResponse,
  ApiStandardResponse,
  ApiPaginatedResponse,
  ApiUpdatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiErrorResponse,
} from '@/common';
import { GetUser, type AuthenticatedUser } from '@/auth/get-user.decorator';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  QueryQuotationDto,
  AddQuotationInventoryItemDto,
  AddQuotationServiceItemDto,
  RemoveQuotationInventoryItemDto,
  RemoveQuotationServiceItemDto,
  QuotationStatusNoteDto,
} from './dto';
import { QuotationsService } from './quotations.service';

@ApiTags('Quotations')
@ApiExtraModels(
  CreateQuotationDto,
  UpdateQuotationDto,
  QueryQuotationDto,
)
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  // ── Create ──

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('quotations:create')
  async create(
    @Body() dto: CreateQuotationDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const quotation = await this.quotationsService.create(dto, user.userId);
    return ResponseBuilder.created(quotation, 'Quotation created successfully');
  }

  // ── List ──

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiPaginatedResponse(Object, { description: 'Paginated list of quotations' })
  @ApiUnauthorizedResponse()
  @ApiErrorResponse()
  async findAll(@Query() query: QueryQuotationDto) {
    const result = await this.quotationsService.findAll(query);
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Quotations retrieved successfully',
    );
  }

  // ── Detail ──

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiStandardResponse(Object, { description: 'Quotation detail with items' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  async findOne(@Param('id') id: string) {
    const quotation = await this.quotationsService.findOne(id);
    return ResponseBuilder.success(quotation, 'Quotation retrieved successfully');
  }

  // ── Update ──

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('quotations:update')
  async update(@Param('id') id: string, @Body() dto: UpdateQuotationDto) {
    const quotation = await this.quotationsService.update(id, dto);
    return ResponseBuilder.updated(quotation, 'Quotation updated successfully');
  }

  // ── Soft Delete ──

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('quotations:delete')
  @ApiDeletedSuccessResponse({ description: 'Quotation deleted successfully' })
  @ApiNotFoundResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async remove(@Param('id') id: string) {
    await this.quotationsService.remove(id);
    return ResponseBuilder.deleted('Quotation deleted successfully');
  }

  // ── Add Inventory Item ──

  @Post(':id/items/inventory')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async addInventoryItem(
    @Param('id') id: string,
    @Body() dto: AddQuotationInventoryItemDto,
  ) {
    const item = await this.quotationsService.addInventoryItem(id, dto);
    return ResponseBuilder.success(item, 'Inventory item added to quotation');
  }

  // ── Add Service Item ──

  @Post(':id/items/service')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async addServiceItem(
    @Param('id') id: string,
    @Body() dto: AddQuotationServiceItemDto,
  ) {
    const item = await this.quotationsService.addServiceItem(id, dto);
    return ResponseBuilder.success(item, 'Service item added to quotation');
  }

  // ── Remove Inventory Item ──

  @Patch(':id/items/inventory/remove')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async removeInventoryItem(
    @Param('id') id: string,
    @Body() dto: RemoveQuotationInventoryItemDto,
  ) {
    await this.quotationsService.removeInventoryItem(id, dto);
    return ResponseBuilder.success(null, 'Inventory item removed from quotation');
  }

  // ── Remove Service Item ──

  @Patch(':id/items/service/remove')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async removeServiceItem(
    @Param('id') id: string,
    @Body() dto: RemoveQuotationServiceItemDto,
  ) {
    await this.quotationsService.removeServiceItem(id, dto);
    return ResponseBuilder.success(null, 'Service item removed from quotation');
  }

  // ── Send ──

  @Post(':id/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async send(
    @Param('id') id: string,
    @Body() dto: QuotationStatusNoteDto,
  ) {
    // Extract validUntil from notes if provided, or default to 30 days
    const quotation = await this.quotationsService.send(id, dto.note || undefined);
    return ResponseBuilder.updated(quotation, 'Quotation sent successfully');
  }

  // ── Accept ──

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async accept(@Param('id') id: string) {
    const quotation = await this.quotationsService.accept(id);
    return ResponseBuilder.updated(quotation, 'Quotation accepted successfully');
  }

  // ── Reject ──

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async reject(@Param('id') id: string) {
    const quotation = await this.quotationsService.reject(id);
    return ResponseBuilder.updated(quotation, 'Quotation rejected successfully');
  }

  // ── Convert to Booking ──

  @Post(':id/convert')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @ApiBearerAuth('JWT-auth')
  @RequirePermissions('bookings:create')
  async convert(@Param('id') id: string) {
    const result = await this.quotationsService.convertToBooking(id);
    return ResponseBuilder.created(
      result,
      'Quotation converted to booking successfully',
    );
  }

  // ── PDF URL ──

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async getPdf(@Param('id') id: string) {
    const url = this.quotationsService.getPdfUrl(id);
    return ResponseBuilder.success({ url }, 'PDF URL generated');
  }
}
