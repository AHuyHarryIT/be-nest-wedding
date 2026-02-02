import { ApiPaginatedResponse, ResponseBuilder } from '@/common';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SelectionQueryDto } from './dto/query-selection.dto';
import { ViewSelectionDto } from './dto/view-selection.dto';
import { SelectionService } from './selection.service';

@Controller('selections')
export class SelectionController {
  constructor(private readonly service: SelectionService) {}

  @Get()
  @ApiOperation({ summary: 'Generic selection API' })
  @ApiQuery({ name: 'entity', required: true, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiPaginatedResponse(ViewSelectionDto, {
    description: 'Paginated list of selections',
  })
  async getSelections(@Query() query: SelectionQueryDto) {
    const result = await this.service.getSelections(query);

    return ResponseBuilder.paginated(result.data, result.pagination);
  }
}
