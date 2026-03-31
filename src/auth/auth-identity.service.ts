import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';

export type AuthUserType = 'customer' | 'staff';

export interface AuthIdentityRecord {
  id: string;
  userType: AuthUserType;
  phoneNumber: string;
  passwordHash: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  isActive: boolean;
  refreshToken?: string | null;
  refreshTokenExpiry?: Date | null;
  createdAt: Date;
}

@Injectable()
export class AuthIdentityService {
  constructor(private readonly databaseService: DatabaseService) {}

  async assertPhoneNumberAvailable(phoneNumber: string): Promise<void> {
    const [customer, staff] = await Promise.all([
      this.databaseService.customer.findUnique({
        where: { phoneNumber },
        select: { id: true },
      }),
      this.databaseService.staff.findUnique({
        where: { phoneNumber },
        select: { id: true },
      }),
    ]);

    if (customer || staff) {
      throw new ConflictException('User with this phone number already exists');
    }
  }

  async assertEmailAvailable(email: string): Promise<void> {
    const [customer, staff] = await Promise.all([
      this.databaseService.customer.findFirst({
        where: { email },
        select: { id: true },
      }),
      this.databaseService.staff.findFirst({
        where: { email },
        select: { id: true },
      }),
    ]);

    if (customer || staff) {
      throw new ConflictException('User with this email already exists');
    }
  }

  async assertStaffIdAvailable(
    staffId: string,
    excludeStaffId?: string,
  ): Promise<void> {
    const staff = await this.databaseService.staff.findFirst({
      where: excludeStaffId
        ? {
            id: staffId,
            NOT: { id: excludeStaffId },
          }
        : { id: staffId },
      select: { id: true },
    });

    if (staff) {
      throw new ConflictException('User with this staff ID already exists');
    }
  }

  async findByPhoneNumber(
    phoneNumber: string,
  ): Promise<AuthIdentityRecord | null> {
    const [customer, staff] = await Promise.all([
      this.databaseService.customer.findUnique({ where: { phoneNumber } }),
      this.databaseService.staff.findUnique({ where: { phoneNumber } }),
    ]);

    if (customer && staff) {
      throw new ConflictException(
        'Phone number is duplicated across customer and staff identities',
      );
    }

    if (customer) {
      return { ...customer, userType: 'customer' };
    }

    if (staff) {
      return { ...staff, userType: 'staff' };
    }

    return null;
  }

  async findById(
    userType: AuthUserType,
    id: string,
  ): Promise<AuthIdentityRecord | null> {
    if (userType === 'customer') {
      const customer = await this.databaseService.customer.findUnique({
        where: { id },
      });
      return customer ? { ...customer, userType: 'customer' } : null;
    }

    const staff = await this.databaseService.staff.findUnique({
      where: { id },
    });

    return staff ? { ...staff, userType: 'staff' } : null;
  }

  async findByRefreshToken(
    refreshToken: string,
  ): Promise<AuthIdentityRecord | null> {
    const trimmedToken = refreshToken.trim();
    const [customer, staff] = await Promise.all([
      this.databaseService.customer.findFirst({
        where: { refreshToken: trimmedToken },
      }),
      this.databaseService.staff.findFirst({
        where: { refreshToken: trimmedToken },
      }),
    ]);

    if (customer && staff) {
      throw new ConflictException(
        'Refresh token is duplicated across customer and staff identities',
      );
    }

    if (customer) {
      return { ...customer, userType: 'customer' };
    }

    if (staff) {
      return { ...staff, userType: 'staff' };
    }

    return null;
  }

  async updateRefreshToken(
    userType: AuthUserType,
    id: string,
    refreshToken: string | null,
    refreshTokenExpiry?: Date | null,
  ): Promise<void> {
    if (userType === 'customer') {
      await this.databaseService.customer.update({
        where: { id },
        data: { refreshToken, refreshTokenExpiry: refreshTokenExpiry ?? null },
      });
      return;
    }

    await this.databaseService.staff.update({
      where: { id },
      data: { refreshToken, refreshTokenExpiry: refreshTokenExpiry ?? null },
    });
  }

  async validateActiveIdentity(
    userType: AuthUserType,
    id: string,
  ): Promise<AuthIdentityRecord> {
    const identity = await this.findById(userType, id);

    if (!identity || !identity.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return identity;
  }
}
