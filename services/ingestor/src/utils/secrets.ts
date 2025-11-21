// Google Secret Manager client
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { Logger } from './logger';

const client = new SecretManagerServiceClient();

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export async function getSecret(secretName: string): Promise<string> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT environment variable not set');
  }

  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;

  try {
    const [version] = await client.accessSecretVersion({ name });
    const payload = version.payload?.data?.toString();
    if (!payload) {
      throw new Error(`Secret ${secretName} has no data`);
    }
    return payload;
  } catch (error) {
    Logger.error('Failed to access secret', {
      event: 'secret_access_failed',
      secretName,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getOAuthCredentials(): Promise<OAuthCredentials> {
  const [clientId, clientSecret, refreshToken] = await Promise.all([
    getSecret('gmail-oauth-client-id'),
    getSecret('gmail-oauth-client-secret'),
    getSecret('gmail-oauth-refresh-token'),
  ]);

  return {
    clientId,
    clientSecret,
    refreshToken,
  };
}
