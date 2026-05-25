#!/usr/bin/env tsx
/**
 * Renew Gmail push notification watch.
 * Gmail watch expires every 7 days — run this daily via GitHub Actions.
 *
 * Env vars required:
 *   GOOGLE_CLOUD_PROJECT — GCP project ID (for Secret Manager + Pub/Sub topic)
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { persistTokens } from 'oauth-token-store';
import { fileURLToPath } from 'url';

const secretClient = new SecretManagerServiceClient();
const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802';

async function getSecret(name: string): Promise<string> {
  const [version] = await secretClient.accessSecretVersion({
    name: `projects/${projectId}/secrets/${name}/versions/latest`,
  });
  return version.payload?.data?.toString() ?? '';
}

function wrapOAuthError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('invalid_grant')) {
    return new Error(
      [
        'Google rechazo el refresh token (`invalid_grant`).',
        'Si tu OAuth app sigue en `Testing`, los refresh tokens para `gmail.readonly` suelen vencer a los 7 dias.',
        'Publica el app en `In production` (o `Internal` si aplica), genera un refresh token nuevo y vuelve a guardar `gmail-oauth-refresh-token`.',
      ].join('\n')
    );
  }

  return error instanceof Error ? error : new Error(message);
}

async function run(): Promise<void> {
  console.log('🔄 Renewing Gmail watch...');

  const [clientId, clientSecret, refreshToken] = await Promise.all([
    getSecret('gmail-oauth-client-id'),
    getSecret('gmail-oauth-client-secret'),
    getSecret('gmail-oauth-refresh-token'),
  ]);

  const oauth2Client = new OAuth2Client(clientId, clientSecret, 'http://localhost');
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  await persistTokens({ refresh_token: refreshToken }, { projectId });

  oauth2Client.on('tokens', (tokens) => {
    if (!tokens.access_token && !tokens.refresh_token) return;
    persistTokens(
      {
        access_token: tokens.access_token ?? undefined,
        refresh_token: tokens.refresh_token || refreshToken,
        expiry_date: tokens.expiry_date ?? undefined,
      },
      { projectId, updateSecretManager: Boolean(tokens.refresh_token) }
    ).catch((err) => console.error('Failed to persist tokens:', err));
  });

  try {
    const accessToken = await oauth2Client.getAccessToken();
    if (!accessToken.token) {
      throw new Error('Google did not return an access token');
    }
  } catch (error) {
    throw wrapOAuthError(error);
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: `projects/${projectId}/topics/gmail-notifications`,
      labelIds: ['INBOX'],
      labelFilterAction: 'include',
    },
  });

  console.log(`✅ Watch renewed — historyId: ${response.data.historyId}, expires: ${new Date(Number(response.data.expiration)).toISOString()}`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  run().catch((err) => {
    console.error('❌ Failed to renew Gmail watch:', err);
    process.exit(1);
  });
}
