const fs = require('fs');
const path = require('path');

const DEFAULT_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'mail-reader-433802';
const DEFAULT_SECRET_NAME =
  process.env.OAUTH_REFRESH_SECRET_NAME || 'gmail-oauth-refresh-token';

function resolveDefaultPath(filename, envValue) {
  if (envValue) return envValue;

  // In Cloud Run, use /tmp for writable storage
  if (process.env.K_SERVICE) {
    return path.join('/tmp', filename);
  }

  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'ops', filename),
    path.join(cwd, '..', 'ops', filename),
    path.join(cwd, '..', '..', 'ops', filename),
    path.join(cwd, filename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.dirname(candidate))) {
      return candidate;
    }
  }

  return candidates[0];
}

const DEFAULT_TOKEN_PATH = resolveDefaultPath('token.json', process.env.OAUTH_TOKEN_PATH);
const DEFAULT_PICKLE_PATH = resolveDefaultPath(
  'token.pickle',
  process.env.OAUTH_TOKEN_PICKLE_PATH
);

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function normalizeTokens(tokens) {
  const payload = { ...tokens };

  // Normalize expiry to milliseconds since epoch
  if (!payload.expiry_date && payload.expires_in) {
    payload.expiry_date = Date.now() + Number(payload.expires_in) * 1000;
  }

  // Normalize scope to string for storage
  if (Array.isArray(payload.scope)) {
    payload.scope = payload.scope.join(' ');
  }

  payload.updated_at = new Date().toISOString();
  return payload;
}

function writeFileSafe(filePath, contents) {
  try {
    ensureDirectory(filePath);
    fs.writeFileSync(filePath, contents);
  } catch (error) {
    // Swallow to avoid breaking caller flows; caller should log if needed
  }
}

function writeTokenFiles(tokens, options = {}) {
  const tokenPath = options.tokenPath || DEFAULT_TOKEN_PATH;
  const picklePath = options.picklePath || DEFAULT_PICKLE_PATH;
  const payload = normalizeTokens(tokens);

  writeFileSafe(tokenPath, JSON.stringify(payload, null, 2));

  // Store the same JSON payload in token.pickle for portability; if Python
  // code expects a true pickle, it can read this JSON and rehydrate as needed.
  writeFileSafe(picklePath, JSON.stringify(payload, null, 2));

  return payload;
}

function readTokenFile(tokenPath = DEFAULT_TOKEN_PATH) {
  if (!fs.existsSync(tokenPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
  } catch (error) {
    return null;
  }
}

async function saveRefreshTokenToSecret(refreshToken, options = {}) {
  const projectId = options.projectId || DEFAULT_PROJECT_ID;
  const secretName = options.secretName || DEFAULT_SECRET_NAME;

  let client = options.secretClient;
  if (!client) {
    // Dynamic import to avoid issues with ES modules
    const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
    client = new SecretManagerServiceClient();
  }

  const parent = `projects/${projectId}/secrets/${secretName}`;
  await client.addSecretVersion({
    parent,
    payload: {
      data: Buffer.from(refreshToken, 'utf8'),
    },
  });
}

async function persistTokens(tokens, options = {}) {
  const payload = writeTokenFiles(tokens, options);

  if (options.updateSecretManager && payload.refresh_token) {
    await saveRefreshTokenToSecret(payload.refresh_token, options);
  }

  return payload;
}

function getTokenPaths() {
  return {
    tokenPath: DEFAULT_TOKEN_PATH,
    picklePath: DEFAULT_PICKLE_PATH,
  };
}

module.exports = {
  writeTokenFiles,
  readTokenFile,
  persistTokens,
  saveRefreshTokenToSecret,
  getTokenPaths,
};
