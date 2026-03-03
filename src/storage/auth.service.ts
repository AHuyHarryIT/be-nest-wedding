import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfidentialClientApplication } from '@azure/msal-node';

/**
 * Authentication service for OneDrive/Microsoft Graph API.
 * Uses OAuth 2.0 client credentials flow (app-only, no user login).
 * Implements in-memory token caching with 5-minute pre-expiry refresh.
 */
@Injectable()
export class AuthService {
  private msalClient: ConfidentialClientApplication;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;
  private readonly TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('AZURE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('AZURE_CLIENT_SECRET');
    const tenantId = this.configService.get<string>('AZURE_TENANT_ID');

    if (!clientId || !clientSecret || !tenantId) {
      throw new Error(
        'Missing required Azure configuration: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID',
      );
    }

    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });
  }

  /**
   * Get an access token using client credentials.
   * Tokens are cached in-memory until they expire.
   * Automatically refreshes 5 minutes before actual expiry.
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();

    // Return cached token if still valid
    if (this.cachedToken && now < this.tokenExpiry) {
      return this.cachedToken;
    }

    const result = await this.msalClient.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });

    if (!result || !result.accessToken) {
      throw new Error('Failed to acquire access token via client credentials');
    }

    this.cachedToken = result.accessToken;

    // Set expiry to 5 minutes before actual token expiration
    this.tokenExpiry = result.expiresOn
      ? result.expiresOn.getTime() - this.TOKEN_REFRESH_BUFFER
      : now + 50 * 60 * 1000;

    return this.cachedToken;
  }
}
