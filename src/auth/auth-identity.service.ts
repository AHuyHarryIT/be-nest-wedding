import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';
import { normalizeVietnamesePhoneNumber } from '@/common/utils/phone.util';

export type AuthUserType = 'customer' | 'staff';

export interface AuthJobRecord {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

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
  jobIds?: string[];
  jobs?: AuthJobRecord[];
  jobId?: string | null;
  job?: AuthJobRecord | null;
}

@Injectable()
export class AuthIdentityService {
  constructor(private readonly databaseService: DatabaseService) {}

  async assertPhoneNumberAvailable(phoneNumber: string): Promise<void> {
    const normalizedPhoneNumber = normalizeVietnamesePhoneNumber(phoneNumber);

    const [customer, staff] = await Promise.all([
      this.databaseService.customer.findUnique({
        where: { phoneNumber: normalizedPhoneNumber },
        select: { id: true },
      }),
      this.databaseService.staff.findUnique({
        where: { phoneNumber: normalizedPhoneNumber },
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

  async assertJobAvailable(jobId: string): Promise<void> {
    const job = await this.databaseService.job.findFirst({
      where: { id: jobId, deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (!job) {
      throw new ConflictException('Job not found or inactive');
    }
  }

  async assertJobsAvailable(jobIds: string[]): Promise<void> {
    const uniqueJobIds = [...new Set(jobIds)];

    for (const jobId of uniqueJobIds) {
      await this.assertJobAvailable(jobId);
    }
  }

  private mapJobsFromStaffRelations(
    staffJobs?: Array<{
      job: AuthJobRecord;
    }>,
  ) {
    const jobs = (staffJobs ?? []).map((entry) => ({
      id: entry.job.id,
      name: entry.job.name,
      description: entry.job.description ?? null,
      isActive: entry.job.isActive,
    }));

    const primaryJob = jobs[0] ?? null;

    return {
      jobIds: jobs.map((job) => job.id),
      jobs,
      jobId: primaryJob?.id ?? null,
      job: primaryJob,
    };
  }

  private normalizeStaffIdentity(staff: {
    id: string;
    phoneNumber: string;
    passwordHash: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    isActive: boolean;
    refreshToken?: string | null;
    refreshTokenExpiry?: Date | null;
    createdAt: Date;
    staffJobs?: Array<{
      job: AuthJobRecord;
    }>;
  }): AuthIdentityRecord {
    const managedJobs = this.mapJobsFromStaffRelations(staff.staffJobs);

    return {
      ...staff,
      ...managedJobs,
      userType: 'staff',
    };
  }

  async findByPhoneNumber(
    phoneNumber: string,
  ): Promise<AuthIdentityRecord | null> {
    const normalizedPhoneNumber = normalizeVietnamesePhoneNumber(phoneNumber);

    const [customer, staff] = await Promise.all([
      this.databaseService.customer.findUnique({
        where: { phoneNumber: normalizedPhoneNumber },
      }),
      this.databaseService.staff.findUnique({
        where: { phoneNumber: normalizedPhoneNumber },
        include: {
          staffJobs: {
            include: {
              job: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  isActive: true,
                },
              },
            },
          },
        },
      }),
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
      return this.normalizeStaffIdentity(staff);
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
      include: {
        staffJobs: {
          include: {
            job: {
              select: {
                id: true,
                name: true,
                description: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    return staff ? this.normalizeStaffIdentity(staff) : null;
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
        include: {
          staffJobs: {
            include: {
              job: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  isActive: true,
                },
              },
            },
          },
        },
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
      return this.normalizeStaffIdentity(staff);
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
