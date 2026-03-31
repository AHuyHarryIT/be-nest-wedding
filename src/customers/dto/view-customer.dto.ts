import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ViewCustomerDto {
  @ApiProperty({ example: 'c9fbaf1f-0f7d-4d89-b0d7-3fd0d5b2bf5f' })
  id: string;

  @ApiProperty({ example: '0903311101' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'Nguyen', nullable: true })
  firstName?: string | null;

  @ApiPropertyOptional({ example: 'An', nullable: true })
  lastName?: string | null;

  @ApiPropertyOptional({ example: 'customer@example.com', nullable: true })
  email?: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/avatar.jpg',
    nullable: true,
  })
  avatarUrl?: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2026-10-10T00:00:00.000Z', nullable: true })
  weddingDate?: Date | null;

  @ApiPropertyOptional({ example: 'The Grand Hall', nullable: true })
  weddingVenue?: string | null;

  @ApiProperty({ example: true })
  emailNotifications: boolean;

  @ApiProperty({ example: true })
  smsNotifications: boolean;

  @ApiProperty({ example: false })
  marketingEmails: boolean;

  @ApiProperty({ example: '2026-03-31T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-31T10:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: null, nullable: true })
  deletedAt?: Date | null;
}
