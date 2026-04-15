import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '@/database/database.service';
import { normalizeVietnamesePhoneNumber } from '@/common/utils/phone.util';
import type {
  AuthSessionIdentityLookup,
  AuthSessionRecord,
} from './session.types';

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

type AuthSessionLookup = {
  id: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    isActive: boolean;
  } | null;
  staff: {
    id: string;
    isActive: boolean;
  } | null;
};

type AuthSessionOwnerRecord = {
  id: string;
  customerId: string | null;
  staffId: string | null;
  revokedAt: Date | null;
};

const AUTH_SESSION_SELECT = {
  id: true,
  tokenHash: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: {
      id: true,
      isActive: true,
    },
  },
  staff: {
    select: {
      id: true,
      isActive: true,
    },
  },
} as const;

const AUTH_SESSION_OWNER_SELECT = {
  id: true,
  customerId: true,
  staffId: true,
  revokedAt: true,
} as const;

const STAFF_WITH_JOBS_INCLUDE = {
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
} as const;

@Injectable()
export class AuthIdentityService {
  constructor(private readonly databaseService: DatabaseService) {}

  private hashRefreshToken(refreshToken: string): string {
    return crypto
      .createHash('sha256')
      .update(refreshToken.trim())
      .digest('hex');
  }

  private mapSessionIdentity(
    session: AuthSessionLookup,
  ): AuthSessionIdentityLookup {
    if (session.customer) {
      return {
        userType: 'customer',
        userId: session.customer.id,
        isActive: session.customer.isActive,
      };
    }

    if (session.staff) {
      return {
        userType: 'staff',
        userId: session.staff.id,
        isActive: session.staff.isActive,
      };
    }

    throw new ConflictException(
      'Auth session has no linked identity owner (customer/staff)',
    );
  }

  private mapSessionRecord(session: AuthSessionLookup): AuthSessionRecord {
    return {
      id: session.id,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      identity: this.mapSessionIdentity(session),
    };
  }

  private sessionOwnerWhere(userType: AuthUserType, userId: string) {
    if (userType === 'customer') {
      return {
        customerId: userId,
      };
    }

    return {
      staffId: userId,
    };
  }

  private isSessionOwnedByPrincipal(
    session: AuthSessionOwnerRecord,
    userType: AuthUserType,
    userId: string,
  ): boolean {
    if (userType === 'customer') {
      return session.customerId === userId;
    }

    return session.staffId === userId;
  }

  private get authSessionModel() {
    return (this.databaseService as any).authSession;
  }

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

  async createAuthSession(
    userType: AuthUserType,
    userId: string,
    refreshToken: string,
    expiresAt: Date,
  ): Promise<AuthSessionRecord> {
    const trimmedToken = refreshToken.trim();

    const ownerData =
      userType === 'customer'
        ? {
            customerId: userId,
            staffId: null,
          }
        : {
            customerId: null,
            staffId: userId,
          };

    const session = (await this.authSessionModel.upsert({
      where: {
        tokenHash: this.hashRefreshToken(trimmedToken),
      },
      update: {
        ...ownerData,
        expiresAt,
        revokedAt: null,
      },
      create: {
        tokenHash: this.hashRefreshToken(trimmedToken),
        expiresAt,
        ...ownerData,
      },
      select: AUTH_SESSION_SELECT,
    })) as AuthSessionLookup;

    return this.mapSessionRecord(session);
  }

  async findAuthSessionByRefreshToken(
    refreshToken: string,
  ): Promise<AuthSessionRecord | null> {
    const trimmedToken = refreshToken.trim();

    if (!trimmedToken) {
      return null;
    }

    const session = (await this.authSessionModel.findFirst({
      where: {
        tokenHash: this.hashRefreshToken(trimmedToken),
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: AUTH_SESSION_SELECT,
    })) as AuthSessionLookup | null;

    if (!session) {
      return null;
    }

    return this.mapSessionRecord(session);
  }

  async revokeAuthSessionByRefreshToken(
    refreshToken: string,
    principal?: {
      userType: AuthUserType;
      userId: string;
    },
  ): Promise<boolean> {
    const trimmedToken = refreshToken.trim();

    if (!trimmedToken) {
      return false;
    }

    const session = (await this.authSessionModel.findUnique({
      where: {
        tokenHash: this.hashRefreshToken(trimmedToken),
      },
      select: AUTH_SESSION_OWNER_SELECT,
    })) as AuthSessionOwnerRecord | null;

    if (!session) {
      return false;
    }

    if (principal) {
      const owned = this.isSessionOwnedByPrincipal(
        session,
        principal.userType,
        principal.userId,
      );
      if (!owned) {
        throw new UnauthorizedException(
          'Refresh token does not belong to user',
        );
      }
    }

    if (session.revokedAt) {
      return false;
    }

    await this.authSessionModel.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return true;
  }

  async revokeAllActiveAuthSessionsForPrincipal(
    userType: AuthUserType,
    userId: string,
  ): Promise<number> {
    const result = await this.authSessionModel.updateMany({
      where: {
        ...this.sessionOwnerWhere(userType, userId),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  async findActiveAuthSessionsForPrincipal(
    userType: AuthUserType,
    userId: string,
  ): Promise<AuthSessionRecord[]> {
    const sessions = (await this.authSessionModel.findMany({
      where: {
        ...this.sessionOwnerWhere(userType, userId),
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: AUTH_SESSION_SELECT,
    })) as AuthSessionLookup[];

    return sessions.map((session) => this.mapSessionRecord(session));
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
        include: STAFF_WITH_JOBS_INCLUDE,
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
      include: STAFF_WITH_JOBS_INCLUDE,
    });

    return staff ? this.normalizeStaffIdentity(staff) : null;
  }

  async findByRefreshToken(
    refreshToken: string,
  ): Promise<AuthIdentityRecord | null> {
    const trimmedToken = refreshToken.trim();

    if (!trimmedToken) {
      return null;
    }

    const session = await this.findAuthSessionByRefreshToken(trimmedToken);

    if (session) {
      const identity = await this.findById(
        session.identity.userType,
        session.identity.userId,
      );

      if (!identity) {
        return null;
      }

      return {
        ...identity,
        refreshToken: trimmedToken,
        refreshTokenExpiry: session.expiresAt,
      };
    }

    const [customer, staff] = await Promise.all([
      this.databaseService.customer.findFirst({
        where: { refreshToken: trimmedToken },
      }),
      this.databaseService.staff.findFirst({
        where: { refreshToken: trimmedToken },
        include: STAFF_WITH_JOBS_INCLUDE,
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
    const normalizedToken = refreshToken?.trim() ?? null;

    if (userType === 'customer') {
      await this.databaseService.customer.update({
        where: { id },
        data: {
          refreshToken: normalizedToken,
          refreshTokenExpiry: refreshTokenExpiry ?? null,
        },
      });
    } else {
      await this.databaseService.staff.update({
        where: { id },
        data: {
          refreshToken: normalizedToken,
          refreshTokenExpiry: refreshTokenExpiry ?? null,
        },
      });
    }

    if (normalizedToken && refreshTokenExpiry) {
      await this.createAuthSession(
        userType,
        id,
        normalizedToken,
        refreshTokenExpiry,
      );
      return;
    }

    if (!normalizedToken) {
      await this.revokeAllActiveAuthSessionsForPrincipal(userType, id);
    }
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
