# Operational Tools

Scripts and utilities for managing the AI Finance Agent system.

## OAuth Token Generator

Interactive tool to get Gmail API OAuth tokens.

### Usage

```bash
# Install dependencies
npm install

# Run the token generator
npm run get-token
```

### Step-by-Step Instructions

1. **Download OAuth Credentials**
   - Go to [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials)
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Choose "Desktop app" as application type
   - Click "Create" and download the JSON file
   - Save it as `credentials.json` in the `ops/` directory

2. **Run the script**
   ```bash
   cd ops
   npm install
   npm run get-token
   ```

3. **Choose authentication method**
   - Option 1 (recommended): Local server - opens browser automatically
   - Option 2: Manual code - copy/paste authorization code

4. **Authorize the app**
   - Browser opens automatically (or copy the URL)
   - Sign in with your Gmail account
   - Grant permissions (readonly access)
   - For local server: will redirect to localhost automatically
   - For manual: copy the code from the browser

5. **Copy the tokens**
   - Script displays the tokens and Secret Manager commands
   - Run the provided commands to store in Secret Manager

### What This Does

- Requests Gmail API readonly scope
- Gets a **refresh token** (never expires unless revoked)
- Provides formatted commands to store in Secret Manager
- Saves token locally in `token.json` (for reference only - don't commit!)

### Troubleshooting

**"Redirect URI mismatch" error:**
- In Google Cloud Console, add these redirect URIs to your OAuth app:
  - `http://localhost:3000/oauth2callback` (for local server method)
  - `urn:ietf:wg:oauth:2.0:oob` (for manual method)

**"Access blocked" error:**
- Your app needs to be verified by Google, OR
- Add your Gmail account as a test user in OAuth consent screen

**Port 3000 already in use:**
- Use Option 2 (manual code entry) instead

## Backfill Tool

Process historical Gmail messages to populate the database.

### Usage

```bash
# Install dependencies
npm install

# Dry run - see what would be processed
tsx backfill.ts --dry-run --days=30

# Backfill last 7 days
tsx backfill.ts --days=7

# Backfill with specific label
tsx backfill.ts --days=30 --label=financial

# Limit number of messages
tsx backfill.ts --days=30 --max=100
```

### Options

- `--days=N` - Number of days to look back (default: 30)
- `--label=LABEL` - Filter by Gmail label (optional)
- `--dry-run` - Preview what would be processed without writing to database
- `--max=N` - Limit maximum number of messages to process (optional)

### Prerequisites

Environment variables:
- `GOOGLE_CLOUD_PROJECT` - Your GCP project ID
- `DATABASE_URL` - PostgreSQL connection string

Secrets (via Secret Manager):
- `gmail-oauth-client-id`
- `gmail-oauth-client-secret`
- `gmail-oauth-refresh-token`

### Example Output

```
AI Finance Agent - Backfill Tool
=================================

Options: { days: 30, dryRun: false }

[INFO] Backfill tool initialized
[INFO] Fetching messages with query: after:1234567890
[INFO] Found 150 messages to process
[INFO] Progress: 10/150
...
[INFO] Backfill complete

========================================
BACKFILL SUMMARY
========================================
Duration: 45.23s
Messages processed: 150
Emails stored: 150
Transactions created: 142
Duplicates skipped: 3
Errors: 5
========================================
```

### Error Handling

- Individual message failures are logged but don't stop the backfill
- Duplicate transactions (based on idempotency key) are automatically skipped
- Progress is logged every 10 messages
- Full error details available in structured logs
