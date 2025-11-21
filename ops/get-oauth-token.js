#!/usr/bin/env node
/**
 * OAuth Token Generator for Gmail API
 *
 * Usage:
 * 1. Download OAuth credentials from Google Cloud Console
 * 2. Save as credentials.json in this directory
 * 3. Run: node get-oauth-token.js
 * 4. Follow the prompts
 */

const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const http = require('http');
const url = require('url');
const open = require('open');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_PATH = 'token.json';
const CREDENTIALS_PATH = 'credentials.json';

// Read credentials
if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error('Error: credentials.json not found!');
  console.error('\nPlease:');
  console.error('1. Go to https://console.cloud.google.com/apis/credentials');
  console.error('2. Create OAuth 2.0 Client ID (Desktop app type)');
  console.error('3. Download credentials and save as credentials.json in this directory');
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));

// Support both web and installed app credentials
const clientId = credentials.web?.client_id || credentials.installed?.client_id;
const clientSecret = credentials.web?.client_secret || credentials.installed?.client_secret;
const redirectUris = credentials.web?.redirect_uris || credentials.installed?.redirect_uris || ['http://localhost:3000/oauth2callback'];

if (!clientId || !clientSecret) {
  console.error('Error: Invalid credentials file format');
  process.exit(1);
}

// Method 1: Using local server (recommended)
async function getTokenWithLocalServer() {
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000/oauth2callback'
  );

  return new Promise((resolve, reject) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force to get refresh token
    });

    console.log('\n🔐 Opening browser for authorization...\n');
    console.log('If browser does not open automatically, visit this URL:');
    console.log(authUrl);
    console.log('');

    // Create local server to receive callback
    const server = http.createServer(async (req, res) => {
      try {
        if (req.url.indexOf('/oauth2callback') > -1) {
          const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
          const code = qs.get('code');

          res.end('✅ Authentication successful! You can close this window and return to terminal.');
          server.close();

          // Get tokens
          const { tokens } = await oauth2Client.getToken(code);

          console.log('\n✅ Success! Got tokens\n');
          resolve(tokens);
        }
      } catch (e) {
        reject(e);
      }
    });

    server.listen(3000, () => {
      // Open browser
      open(authUrl, { wait: false }).catch(() => {
        console.log('Could not open browser automatically');
      });
    });
  });
}

// Method 2: Manual code entry (fallback)
async function getTokenWithManualCode() {
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob' // Out of band redirect for manual code
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n🔐 Authorize this app by visiting this URL:\n');
  console.log(authUrl);
  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the authorization code from the browser: ', async (code) => {
      rl.close();
      try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\n✅ Success! Got tokens\n');
        resolve(tokens);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Main function
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Gmail API OAuth Token Generator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Ask user which method to use
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('Choose authentication method:');
  console.log('1. Local server (recommended - opens browser automatically)');
  console.log('2. Manual code entry (if port 3000 is blocked)\n');

  rl.question('Enter choice (1 or 2): ', async (choice) => {
    rl.close();

    let tokens;
    try {
      if (choice === '1') {
        tokens = await getTokenWithLocalServer();
      } else {
        tokens = await getTokenWithManualCode();
      }

      // Save token to file
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      console.log('📝 Token saved to:', TOKEN_PATH);

      // Display values for Secret Manager
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  Copy these values to Secret Manager');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log('CLIENT_ID:');
      console.log(clientId);
      console.log('');

      console.log('CLIENT_SECRET:');
      console.log(clientSecret);
      console.log('');

      console.log('REFRESH_TOKEN:');
      console.log(tokens.refresh_token);
      console.log('');

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  Commands to store in Secret Manager');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      console.log(`echo -n '${clientId}' | gcloud secrets versions add gmail-oauth-client-id --data-file=-`);
      console.log('');
      console.log(`echo -n '${clientSecret}' | gcloud secrets versions add gmail-oauth-client-secret --data-file=-`);
      console.log('');
      console.log(`echo -n '${tokens.refresh_token}' | gcloud secrets versions add gmail-oauth-refresh-token --data-file=-`);
      console.log('');

      console.log('\n✅ Done! You can now deploy the services.\n');

    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error('\nTroubleshooting:');
      console.error('1. Make sure credentials.json is valid');
      console.error('2. Check that OAuth app is configured correctly in Google Cloud Console');
      console.error('3. Try the other authentication method');
      process.exit(1);
    }
  });
}

main();
