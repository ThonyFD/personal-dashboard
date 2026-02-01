export interface TokenData {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  expires_in?: number;
  scope?: string | string[];
  token_type?: string;
  id_token?: string;
  [key: string]: any;
}

export interface PersistOptions {
  tokenPath?: string;
  picklePath?: string;
  updateSecretManager?: boolean;
  projectId?: string;
  secretName?: string;
  secretClient?: any;
}

export function writeTokenFiles(tokens: TokenData, options?: PersistOptions): TokenData;
export function readTokenFile(tokenPath?: string): TokenData | null;
export function persistTokens(tokens: TokenData, options?: PersistOptions): Promise<TokenData>;
export function saveRefreshTokenToSecret(
  refreshToken: string,
  options?: PersistOptions
): Promise<void>;
export function getTokenPaths(): { tokenPath: string; picklePath: string };
