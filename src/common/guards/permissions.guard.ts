import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { DatabaseService } from '../../database/database.service';
import type { AuthenticatedUser } from '../../auth/get-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedUser;
    }>();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Get user's roles with their permissions
    const userRoles = await this.databaseService.userRole.findMany({
      where: {
        userId: user.userId,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // Extract all permission keys the user has
    const userPermissions = new Set<string>();
    userRoles.forEach((userRole) => {
      userRole.role.permissions.forEach((rolePermission) => {
        userPermissions.add(rolePermission.permission.key);
      });
    });

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Missing required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
