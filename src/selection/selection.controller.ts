import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SelectionQueryDto } from './dto/selection-query.dto';
import { SelectionResponseDto } from './dto/selection-response.dto';
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
  @ApiOkResponse({ type: SelectionResponseDto })
  getSelections(@Query() query: SelectionQueryDto) {
    return this.service.getSelections(query);
  }
}
