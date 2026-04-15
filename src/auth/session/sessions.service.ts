import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DatabaseService } from '@/database/database.service';
import type { AuthUserType } from '@/auth/auth-identity.service';

export interface SessionPrincipal {
  userType: AuthUserType;
  userId: string;
}

export interface SessionItem {
  id: string;
  isCurrent: boolean;
  createdAt: Date;
  expiresAt: Date;
  updatedAt: Date;
}

@Injectable()
export class SessionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private buildOwnerWhere(principal: SessionPrincipal) {
    if (principal.userType === 'customer') {
      return {
        customerId: principal.userId,
        staffId: null,
      };
    }

    return {
      customerId: null,
      staffId: principal.userId,
    };
  }

  private hashRefreshToken(refreshToken: string): string {
    return crypto
      .createHash('sha256')
      .update(refreshToken.trim())
      .digest('hex');
  }

  private async findCurrentSessionId(
    principal: SessionPrincipal,
    refreshToken: string,
  ): Promise<string | null> {
    const token = refreshToken.trim();

    if (!token) {
      return null;
    }

    const currentSession = await (
      this.databaseService as any
    ).authSession.findFirst({
      where: {
        ...this.buildOwnerWhere(principal),
        tokenHash: this.hashRefreshToken(token),
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    return currentSession?.id ?? null;
  }

  async listActiveSessions(
    principal: SessionPrincipal,
    refreshToken: string,
  ): Promise<SessionItem[]> {
    const [currentSessionId, sessions] = await Promise.all([
      this.findCurrentSessionId(principal, refreshToken),
      (this.databaseService as any).authSession.findMany({
        where: {
          ...this.buildOwnerWhere(principal),
          revokedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          createdAt: true,
          expiresAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return sessions.map((session: any) => ({
      id: session.id,
      isCurrent: currentSessionId === session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      updatedAt: session.updatedAt,
    }));
  }

  async revokeSession(
    principal: SessionPrincipal,
    sessionId: string,
    refreshToken: string,
  ): Promise<void> {
    const currentSessionId = await this.findCurrentSessionId(
      principal,
      refreshToken,
    );

    if (currentSessionId && currentSessionId === sessionId) {
      throw new ConflictException(
        'Current session must be revoked via standard logout flow',
      );
    }

    const targetSession = await (
      this.databaseService as any
    ).authSession.findFirst({
      where: {
        id: sessionId,
        ...this.buildOwnerWhere(principal),
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    if (!targetSession) {
      throw new NotFoundException('Session not found');
    }

    await (this.databaseService as any).authSession.update({
      where: {
        id: targetSession.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
