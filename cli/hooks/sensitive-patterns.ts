/**
 * Default patterns for protecting sensitive files from AI access.
 * These patterns use gitignore syntax and are applied when no
 * project-specific ignore files are found.
 */

// === ENVIRONMENT & CONFIG ===
export const ENVIRONMENT_PATTERNS = [
  '.env',          // Block the base .env file
  '.env.*',        // Block all .env variants  
  '!.env.example', // Then allow template files
  '!.env.template',
  '!.env.sample',
];

// === CRYPTOGRAPHIC MATERIALS ===
export const CERTIFICATE_PATTERNS = [
  '*.pem',
  '*.key',
  '*.crt',
  '*.cer',
  '*.p12',
  '*.pfx',
];

// === SSH & VERSION CONTROL ===
export const SSH_PATTERNS = [
  '.ssh/**',           // All files in .ssh directory (recursive)
  '**/id_rsa*',       // SSH RSA keys anywhere
  '**/id_dsa*',       // SSH DSA keys anywhere  
  '**/id_ecdsa*',     // SSH ECDSA keys anywhere
  '**/id_ed25519*',   // SSH Ed25519 keys anywhere
  '*.ppk',            // PuTTY private keys
];

// === CLOUD PROVIDERS ===
export const CLOUD_PATTERNS = [
  // AWS
  '.aws/**',
  'aws_credentials',
  
  // Azure
  '.azure/**',
  'azure.json',
  
  // Google Cloud
  '.gcloud/**',
  'gcp-key.json',
  
  // Kubernetes
  '.kube/**',
  
  // Docker
  '.docker/config.json',
  '.dockercfg',
  
  // Infrastructure as Code
  '.terraform/**',
  'terraform.tfvars',
  '.pulumi/**',
];

// === PACKAGE MANAGERS ===
export const PACKAGE_MANAGER_PATTERNS = [
  '.npmrc',
  '.pypirc',
  '.cargo/credentials',
  '.gem/credentials',
  '.bundle/config',
  '.m2/settings.xml',
];

// === AUTHENTICATION ===
export const AUTH_PATTERNS = [
  '.netrc',
  '.authinfo',
  '.authinfo.gpg',
  '.gitconfig',       // May contain tokens
  '.git-credentials',
];

// === CRYPTOGRAPHY ===
export const CRYPTO_PATTERNS = [
  '.gnupg/**',
  '*.gpg',
  '*.asc',
  '*.sig',
  'keystore',
  'truststore',
];

// === DATABASE ===
export const DATABASE_PATTERNS = [
  '.pgpass',
  '.my.cnf',
  '.mysql_history',
  '.psql_history',
  '.redis_history',
  '.mongoshrc.js',
];

// === TOKENS & SECRETS ===
export const TOKEN_PATTERNS = [
  '*.token',          // Files with .token extension
  'token.*',          // token.json, token.txt, etc.
  'secrets.*',        // secrets.json, secrets.yaml, etc.
  '*_token.txt',      // Text token files
  '*_token.json',     // JSON token files  
  '*_secret.txt',     // Text secret files
  '*_secret.json',    // JSON secret files
  '.secrets',         // Hidden secrets file
  'api-keys.*',       // API key files
  'credentials.*',    // Credential files
];

// === WALLETS & FINANCIAL ===
export const WALLET_PATTERNS = [
  'wallet.dat',       // Bitcoin wallet
  'wallet.json',      // Ethereum wallet
  '*.wallet',         // Generic wallet files
  '*.keystore',       // Ethereum keystore
  'seed.txt',         // Wallet seed phrases
];

// === PRODUCTION DATA ===
export const PRODUCTION_PATTERNS = [
  'production.db',    // Production database
  'prod.db',          // Production database
  '**/prod*.db',      // Production-prefixed databases
  '*.sqlite3',        // SQLite3 databases (production format)
  'dump.sql',         // Database dumps
  '*.dump',           // Generic dumps
];

// === COMBINED DEFAULT PATTERNS ===
export const DEFAULT_PATTERNS = [
  ...ENVIRONMENT_PATTERNS,
  ...CERTIFICATE_PATTERNS,
  ...SSH_PATTERNS,
  ...CLOUD_PATTERNS,
  ...PACKAGE_MANAGER_PATTERNS,
  ...AUTH_PATTERNS,
  ...CRYPTO_PATTERNS,
  ...DATABASE_PATTERNS,
  ...TOKEN_PATTERNS,
  ...WALLET_PATTERNS,
  ...PRODUCTION_PATTERNS,
];

// === VALIDATION UTILITIES ===

/**
 * Validates a gitignore-style pattern for common issues
 * @param pattern The pattern to validate
 * @returns The corrected pattern or null if invalid
 */
export function validatePattern(pattern: string): string | null {
  // Check for common mistakes
  if (pattern.includes('\\')) {
    console.warn(`Warning: Pattern "${pattern}" contains backslash. Use forward slashes.`);
    return pattern.replace(/\\/g, '/');
  }
  
  if (pattern.match(/^\s|\s$/)) {
    console.warn(`Warning: Pattern "${pattern}" has leading/trailing whitespace.`);
    return pattern.trim();
  }
  
  // Check for regex patterns (not supported in gitignore)
  if (pattern.match(/[\^$()[\]{}+?]/)) {
    console.warn(`Warning: Pattern "${pattern}" looks like regex. Use glob patterns instead.`);
  }
  
  return pattern;
}

/**
 * Get a description for a pattern category
 * @param category The category name
 * @returns Human-readable description
 */
export function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    ENVIRONMENT: 'Environment variables and configuration files',
    CERTIFICATE: 'SSL/TLS certificates and cryptographic keys',
    SSH: 'SSH keys and configuration',
    CLOUD: 'Cloud provider credentials and configuration',
    PACKAGE_MANAGER: 'Package manager authentication files',
    AUTH: 'Authentication and authorization files',
    CRYPTO: 'Cryptographic materials and key stores',
    DATABASE: 'Database credentials and history',
    TOKEN: 'API tokens and secrets',
    WALLET: 'Cryptocurrency wallets and financial data',
    PRODUCTION: 'Production databases and data dumps',
  };
  
  return descriptions[category] ?? 'Unknown category';
}