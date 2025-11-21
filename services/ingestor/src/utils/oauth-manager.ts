// OAuth Token Manager
// Manages automatic refresh of OAuth access tokens

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { Logger } from './logger';

interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  refresh_token?: string; // Sometimes Google returns a new refresh token
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export class OAuthTokenManager {
  private secretClient: SecretManagerServiceClient;
  private projectId: string;
  private cachedToken: CachedToken | null = null;
  private refreshingPromise: Promise<string> | null = null;

  constructor(projectId?: string) {
    this.projectId = projectId || process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802';
    this.secretClient = new SecretManagerServiceClient();
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string> {
    // If we have a valid cached token, return it
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
      // Token is valid for at least 5 more minutes
      Logger.info('Using cached access token', {
        event: 'token_cache_hit',
        expiresIn: Math.floor((this.cachedToken.expiresAt - Date.now()) / 1000),
      });
      return this.cachedToken.accessToken;
    }

    // If we're already refreshing, wait for that promise
    if (this.refreshingPromise) {
      Logger.info('Waiting for in-flight token refresh', { event: 'token_refresh_wait' });
      return this.refreshingPromise;
    }

    // Start a new refresh
    this.refreshingPromise = this.refreshAccessToken();

    try {
      const accessToken = await this.refreshingPromise;
      return accessToken;
    } finally {
      this.refreshingPromise = null;
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    const timer = Logger.startTimer();

    try {
      Logger.info('Refreshing OAuth access token', { event: 'token_refresh_start' });

      // Get OAuth credentials from Secret Manager
      const credentials = await this.getOAuthCredentials();

      // Exchange refresh token for new access token
      const tokenResponse = await this.exchangeRefreshToken(credentials);

      // Cache the new token
      this.cachedToken = {
        accessToken: tokenResponse.access_token,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      };

      // If Google returned a new refresh token, update it in Secret Manager
      if (tokenResponse.refresh_token && tokenResponse.refresh_token !== credentials.refreshToken) {
        await this.updateRefreshToken(tokenResponse.refresh_token);
      }

      Logger.info('Access token refreshed successfully', {
        event: 'token_refresh_success',
        expiresIn: tokenResponse.expires_in,
        duration_ms: timer(),
      });

      return tokenResponse.access_token;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      Logger.error('Failed to refresh access token', {
        event: 'token_refresh_failed',
        error: errorMessage,
        duration_ms: timer(),
      });

      // If it's an invalid_grant error, the refresh token is invalid
      if (errorMessage.includes('invalid_grant')) {
        Logger.error('Refresh token is invalid or expired', {
          event: 'refresh_token_invalid',
          message: 'Manual intervention required to renew OAuth credentials',
        });
      }

      throw error;
    }
  }

  /**
   * Get OAuth credentials from Secret Manager
   */
  private async getOAuthCredentials(): Promise<OAuthCredentials> {
    const [clientIdSecret] = await this.secretClient.accessSecretVersion({
      name: `projects/${this.projectId}/secrets/gmail-oauth-client-id/versions/latest`,
    });

    const [clientSecretSecret] = await this.secretClient.accessSecretVersion({
      name: `projects/${this.projectId}/secrets/gmail-oauth-client-secret/versions/latest`,
    });

    const [refreshTokenSecret] = await this.secretClient.accessSecretVersion({
      name: `projects/${this.projectId}/secrets/gmail-oauth-refresh-token/versions/latest`,
    });

    const clientId = clientIdSecret.payload?.data?.toString() || '';
    const clientSecret = clientSecretSecret.payload?.data?.toString() || '';
    const refreshToken = refreshTokenSecret.payload?.data?.toString() || '';

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing OAuth credentials in Secret Manager');
    }

    return { clientId, clientSecret, refreshToken };
  }

  /**
   * Exchange refresh token for access token
   */
  private async exchangeRefreshToken(credentials: OAuthCredentials): Promise<TokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth token refresh failed: ${response.status} ${errorText}`);
    }

    const tokenResponse = (await response.json()) as TokenResponse;

    if (!tokenResponse.access_token) {
      throw new Error('OAuth response missing access_token');
    }

    return tokenResponse;
  }

  /**
   * Update refresh token in Secret Manager
   * (Google sometimes returns a new refresh token when refreshing)
   */
  private async updateRefreshToken(newRefreshToken: string): Promise<void> {
    const timer = Logger.startTimer();

    try {
      Logger.info('Updating refresh token in Secret Manager', {
        event: 'refresh_token_update_start',
      });

      const parent = `projects/${this.projectId}/secrets/gmail-oauth-refresh-token`;

      await this.secretClient.addSecretVersion({
        parent,
        payload: {
          data: Buffer.from(newRefreshToken, 'utf8'),
        },
      });

      Logger.info('Refresh token updated successfully', {
        event: 'refresh_token_updated',
        duration_ms: timer(),
      });
    } catch (error) {
      Logger.error('Failed to update refresh token', {
        event: 'refresh_token_update_failed',
        error: error instanceof Error ? error.message : String(error),
        duration_ms: timer(),
      });
      // Don't throw - this is not critical, we can continue with the old token
    }
  }

  /**
   * Clear the cached token (useful for testing or after errors)
   */
  clearCache(): void {
    this.cachedToken = null;
    Logger.info('Token cache cleared', { event: 'token_cache_cleared' });
  }

  /**
   * Get token expiration time (for monitoring)
   */
  getTokenExpiresIn(): number | null {
    if (!this.cachedToken) {
      return null;
    }
    return Math.floor((this.cachedToken.expiresAt - Date.now()) / 1000);
  }
}
