import { ApiProperty } from '@nestjs/swagger';

export class SessionItemDto {
  @ApiProperty({
    description: 'Session identifier',
    example: 'f99e2f08-a872-4f4d-b22a-aa82d31be8b2',
  })
  id: string;

  @ApiProperty({
    description:
      'Whether this session matches the current refresh-token cookie',
    example: true,
  })
  isCurrent: boolean;

  @ApiProperty({
    description: 'Session creation timestamp',
    example: '2026-04-15T08:10:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Session expiry timestamp',
    example: '2026-04-22T08:10:00.000Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Latest session update timestamp',
    example: '2026-04-15T08:10:00.000Z',
  })
  updatedAt: Date;
}
