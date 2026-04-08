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
