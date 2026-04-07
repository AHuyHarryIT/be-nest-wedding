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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiCreatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiErrorResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiPaginatedResponse,
  ApiStandardResponse,
  ApiUnauthorizedResponse,
  ApiUpdatedSuccessResponse,
  ResponseBuilder,
} from '../common';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { GetUser, type AuthenticatedUser } from '../auth/get-user.decorator';
import { InventoryService } from './inventory.service';
import {
  CreateInventoryCategoryDto,
  UpdateInventoryCategoryDto,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryQueryDto,
  InventoryLogQueryDto,
  CheckoutInventoryDto,
  CheckinInventoryDto,
  AdjustStockDto,
} from './dto';

@ApiTags('Inventory')
@ApiExtraModels(
  CreateInventoryCategoryDto,
  UpdateInventoryCategoryDto,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryQueryDto,
  InventoryLogQueryDto,
  CheckoutInventoryDto,
  CheckinInventoryDto,
  AdjustStockDto,
)
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ================== CATEGORIES ==================

  @Post('categories')
  @RequirePermissions('inventory:create')
  @ApiOperation({ summary: 'Create a new inventory category' })
  @ApiCreatedSuccessResponse({ description: 'Category created successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiErrorResponse({ description: 'Error creating category' })
  async createCategory(@Body() createDto: CreateInventoryCategoryDto) {
    const category = await this.inventoryService.createCategory(createDto);
    return ResponseBuilder.created(category, 'Inventory category created successfully');
  }

  @Get('categories')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'List all inventory categories' })
  @ApiStandardResponse(Object, { description: 'Categories retrieved successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findAllCategories() {
    const categories = await this.inventoryService.findAllCategories();
    return ResponseBuilder.success(categories, 'Categories retrieved successfully');
  }

  @Patch('categories/:id')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Update an inventory category' })
  @ApiUpdatedSuccessResponse({ description: 'Category updated successfully' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  async updateCategory(
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryCategoryDto,
  ) {
    const category = await this.inventoryService.updateCategory(id, updateDto);
    return ResponseBuilder.updated(category, 'Category updated successfully');
  }

  @Delete('categories/:id')
  @RequirePermissions('inventory:delete')
  @ApiOperation({ summary: 'Delete an inventory category' })
  @ApiDeletedSuccessResponse({ description: 'Category deleted successfully' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async removeCategory(@Param('id') id: string) {
    await this.inventoryService.deleteCategory(id);
    return ResponseBuilder.deleted('Inventory category deleted successfully');
  }

  // ================== INVENTORY ITEMS ==================

  @Post('items')
  @RequirePermissions('inventory:create')
  @ApiOperation({ summary: 'Create a new inventory item' })
  @ApiCreatedSuccessResponse({ description: 'Item created successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiErrorResponse({ description: 'Error creating item' })
  async createItem(@Body() createDto: CreateInventoryItemDto) {
    const item = await this.inventoryService.createItem(createDto);
    return ResponseBuilder.created(item, 'Inventory item created successfully');
  }

  @Get('items')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get all inventory items with pagination, search, and filters' })
  @ApiPaginatedResponse(Object, { description: 'Items retrieved successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findAllItems(@Query() query: InventoryQueryDto) {
    const result = await this.inventoryService.findAllItems(query);
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Inventory items retrieved successfully',
    );
  }

  @Get('items/:id')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get an inventory item by ID, including logs and bookings' })
  @ApiStandardResponse(Object, { description: 'Item retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Item not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findOneItem(@Param('id') id: string) {
    const item = await this.inventoryService.findOneItem(id);
    return ResponseBuilder.success(item, 'Inventory item retrieved successfully');
  }

  @Patch('items/:id')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Update an inventory item' })
  @ApiUpdatedSuccessResponse({ description: 'Item updated successfully' })
  @ApiNotFoundResponse({ description: 'Item not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiBadRequestResponse()
  async updateItem(
    @Param('id') id: string,
    @Body() updateDto: UpdateInventoryItemDto,
  ) {
    const item = await this.inventoryService.updateItem(id, updateDto);
    return ResponseBuilder.updated(item, 'Inventory item updated successfully');
  }

  @Delete('items/:id')
  @RequirePermissions('inventory:delete')
  @ApiOperation({ summary: 'Soft delete an inventory item' })
  @ApiDeletedSuccessResponse({ description: 'Item deleted successfully' })
  @ApiNotFoundResponse({ description: 'Item not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async removeItem(@Param('id') id: string) {
    await this.inventoryService.removeItem(id);
    return ResponseBuilder.deleted('Inventory item deleted successfully');
  }

  // ================== CHECKOUT / CHECKIN ==================

  @Post('items/:id/checkout')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Check out a rental inventory item' })
  @ApiStandardResponse(Object, { description: 'Item checked out successfully' })
  @ApiNotFoundResponse({ description: 'Item not found' })
  @ApiBadRequestResponse({ description: 'Invalid stock or item type' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async checkoutItem(
    @Param('id') id: string,
    @Body() dto: CheckoutInventoryDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const result = await this.inventoryService.checkoutItem(id, dto, user?.userId);
    return ResponseBuilder.success(result, 'Inventory item checked out successfully');
  }

  @Post('items/:id/checkin')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Check in a rental inventory item' })
  @ApiStandardResponse(Object, { description: 'Item checked in successfully' })
  @ApiNotFoundResponse({ description: 'Item not found' })
  @ApiBadRequestResponse({ description: 'No items checked out' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async checkinItem(
    @Param('id') id: string,
    @Body() dto: CheckinInventoryDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const result = await this.inventoryService.checkinItem(id, dto, user?.userId);
    return ResponseBuilder.success(result, 'Inventory item checked in successfully');
  }

  // ================== LOGS ==================

  @Get('items/:id/logs')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'Get inventory history logs for an item' })
  @ApiStandardResponse(Object, { description: 'Logs retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Item not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async getItemLogs(@Param('id') id: string) {
    const logs = await this.inventoryService.findItemLogs(id);
    return ResponseBuilder.success(logs, 'Inventory logs retrieved successfully');
  }

  @Get('logs')
  @RequirePermissions('inventory:read')
  @ApiOperation({ summary: 'List all inventory logs (paginated)' })
  @ApiPaginatedResponse(Object, { description: 'Logs retrieved successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findAllLogs(@Query() query: InventoryLogQueryDto) {
    const result = await this.inventoryService.findAllLogs(query);
    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Inventory logs retrieved successfully',
    );
  }

  // ================== STOCK ADJUSTMENT ==================

  @Post('items/:id/adjust-stock')
  @RequirePermissions('inventory:update')
  @ApiOperation({ summary: 'Manually adjust stock for an inventory item' })
  @ApiStandardResponse(Object, { description: 'Stock adjusted successfully' })
  @ApiNotFoundResponse({ description: 'Item not found' })
  @ApiBadRequestResponse({ description: 'Invalid adjustment' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async adjustStock(
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    const result = await this.inventoryService.adjustStock(id, dto, user?.userId);
    return ResponseBuilder.success(result, 'Stock adjusted successfully');
  }
}
