import { google } from 'googleapis';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import open from 'open';
import http from 'http';
import url from 'url';
import { OAuth2Client } from 'google-auth-library';
import { persistTokens } from 'oauth-token-store';

// Configuration
const PORT = 3000;
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802';
// This URL allows for fully automated token retrieval (no copy-paste)
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

async function main() {
    console.log('🔄 Starting OAuth Refresh Token Renewal (VERSION 3.0 - AUTOMATED MODE)...');

    try {
        // 1. Get Client ID and Secret from Secret Manager
        console.log('🔐 Fetching OAuth credentials from Secret Manager...');
        const secretClient = new SecretManagerServiceClient();

        const [clientIdSecret] = await secretClient.accessSecretVersion({
            name: `projects/${PROJECT_ID}/secrets/gmail-oauth-client-id/versions/latest`,
        });
        const [clientSecretSecret] = await secretClient.accessSecretVersion({
            name: `projects/${PROJECT_ID}/secrets/gmail-oauth-client-secret/versions/latest`,
        });

        const clientId = clientIdSecret.payload?.data?.toString();
        const clientSecret = clientSecretSecret.payload?.data?.toString();

        if (!clientId || !clientSecret) {
            throw new Error('Could not retrieve Client ID or Client Secret from Secret Manager');
        }

        // 2. Create OAuth Client
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            REDIRECT_URI
        );

        // 3. Generate Auth URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent',
        });

        // 4. Start Local Server to listen for callback
        console.log('🌐 Starting local server to capture callback...');

        const server = http.createServer(async (req, res) => {
            try {
                if (req.url && req.url.startsWith('/oauth2callback')) {
                    const qs = new url.URL(req.url, `http://localhost:${PORT}`).searchParams;
                    const code = qs.get('code');

                    if (code) {
                        res.end('<h1>Authentication successful!</h1><p>You can close this window now. The script is updating the token...</p>');

                        console.log('✅ Authorization code received automatically.');

                        // 5. Exchange code for tokens
                        console.log('🔄 Exchanging code for tokens...');
                        const { tokens } = await oauth2Client.getToken(code);

                        if (tokens.refresh_token) {
                            console.log('✨ New Refresh Token obtained!');

                            await persistTokens(
                                {
                                    access_token: tokens.access_token,
                                    refresh_token: tokens.refresh_token,
                                    expiry_date: tokens.expiry_date,
                                    scope: tokens.scope,
                                },
                                {
                                    projectId: PROJECT_ID,
                                }
                            );

                            // 6. Update Secret Manager
                            console.log('💾 Updating Secret Manager...');
                            await secretClient.addSecretVersion({
                                parent: `projects/${PROJECT_ID}/secrets/gmail-oauth-refresh-token`,
                                payload: {
                                    data: Buffer.from(tokens.refresh_token, 'utf8'),
                                },
                            });

                            console.log('✅ Secret Manager updated successfully!');
                            console.log('📝 token.json/token.pickle updated locally (ops/).');
                            console.log('\n🎉 SUCCESS! The refresh token has been renewed and saved.');
                            console.log('You may need to restart your services if they cache the token.');
                        } else {
                            console.warn('⚠️  No refresh token returned. You might need to revoke access first or use prompt: "consent".');
                        }

                        server.close();
                        process.exit(0);
                    }
                }
            } catch (error) {
                console.error('❌ Error in callback handler:', error);
                res.statusCode = 500;
                res.end('Error during authentication.');
                server.close();
                process.exit(1);
            }
        });

        server.listen(PORT, async () => {
            console.log(`👂 Listening on port ${PORT}`);
            console.log(`👉 Opening browser to: ${authUrl}`);

            // 7. Open Browser
            await open(authUrl);
        });

    } catch (error) {
        console.error('❌ Fatal Error:', error);
        process.exit(1);
    }
}

main();
