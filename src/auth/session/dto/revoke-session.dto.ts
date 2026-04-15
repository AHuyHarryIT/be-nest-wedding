import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import {
  SESSION_ACCESS_SCOPE,
  type SessionAccessScope,
} from '../session.constants';

export class RevokeSessionDto {
  @ApiPropertyOptional({
    enum: Object.values(SESSION_ACCESS_SCOPE),
    description:
      'Session scope selector. staff routes can revoke customer or staff sessions; /auth/sessions defaults to caller identity.',
  })
  @IsOptional()
  @IsIn(Object.values(SESSION_ACCESS_SCOPE))
  scope?: SessionAccessScope;
}
