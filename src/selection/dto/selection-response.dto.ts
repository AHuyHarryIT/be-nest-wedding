import { ApiProperty } from '@nestjs/swagger';

class SelectionItemDto {
  @ApiProperty()
  value: string | number;

  @ApiProperty()
  label: string;

  @ApiProperty({ required: false })
  extra?: Record<string, any>;
}

class SelectionMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasNext: boolean;
}

export class SelectionResponseDto {
  @ApiProperty({ type: [SelectionItemDto] })
  items: SelectionItemDto[];

  @ApiProperty()
  meta: SelectionMetaDto;
}
