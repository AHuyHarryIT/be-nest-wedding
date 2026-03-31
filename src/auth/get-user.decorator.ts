import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserContext } from '../common/types';

export interface AuthenticatedUser {
  userId: string;
  phoneNumber: string;
  userType: 'customer' | 'staff';
}

export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as UserContext;
  },
);
