import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiCreatedSuccessResponse,
  ApiDeletedSuccessResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiStandardResponse,
  ApiUpdatedSuccessResponse,
  ResponseBuilder,
} from '../common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import {
  CreateCustomerDto,
  QueryCustomerDto,
  UpdateCustomerDto,
  ViewCustomerDto,
} from './dto';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@ApiExtraModels(
  CreateCustomerDto,
  UpdateCustomerDto,
  QueryCustomerDto,
  ViewCustomerDto,
)
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequirePermissions('customers:create')
  @ApiOperation({ summary: 'Create a new customer account' })
  @ApiCreatedSuccessResponse({ description: 'Customer created successfully' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  @ApiErrorResponse({ description: 'Error occurred while creating customer' })
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    const customer = await this.customersService.create(createCustomerDto);
    return ResponseBuilder.created(customer, 'Customer created successfully');
  }

  @Get()
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Get all customers with pagination' })
  @ApiPaginatedResponse(ViewCustomerDto, {
    description: 'Paginated list of customers',
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findAll(@Query() query: QueryCustomerDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const { search, sortBy, sortOrder } = query;
    const result = await this.customersService.findAll({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      includeDeleted: query.includeDeleted,
    });

    return ResponseBuilder.paginated(
      result.data,
      result.pagination,
      'Customers retrieved successfully',
    );
  }

  @Get(':id')
  @RequirePermissions('customers:read')
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiStandardResponse(ViewCustomerDto, {
    description: 'Customer found successfully',
  })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async findOne(@Param('id') id: string) {
    const customer = await this.customersService.findOne(id);
    return ResponseBuilder.success(customer, 'Customer retrieved successfully');
  }

  @Patch(':id')
  @RequirePermissions('customers:update')
  @ApiOperation({ summary: 'Update a customer by ID' })
  @ApiUpdatedSuccessResponse({ description: 'Customer updated successfully' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    const customer = await this.customersService.update(id, updateCustomerDto);
    return ResponseBuilder.success(customer, 'Customer updated successfully');
  }

  @Delete(':id')
  @RequirePermissions('customers:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a customer by ID' })
  @ApiDeletedSuccessResponse({ description: 'Customer deleted successfully' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async remove(@Param('id') id: string) {
    const result = await this.customersService.delete(id);
    return ResponseBuilder.deleted(result.message);
  }
}
