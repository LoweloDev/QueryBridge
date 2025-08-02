/**
 * Environment detection and configuration
 * Automatically detects runtime environment and configures database availability
 */

export interface EnvironmentConfig {
  isReplit: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
  availableDatabases: {
    postgresql: boolean;
    mongodb: boolean;
    redis: boolean;
    dynamodb: boolean;
    elasticsearch: boolean;
  };
}

export function detectEnvironment(): EnvironmentConfig {
  const isReplit = !!(
    process.env.REPLIT_DB_URL ||
    process.env.REPL_ID ||
    process.env.REPL_SLUG ||
    process.env.REPLIT_CLUSTER
  );

  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  // In Replit environment, only PostgreSQL (via Neon) is reliably available
  const availableDatabases = {
    postgresql: true, // Always available via DATABASE_URL
    mongodb: !isReplit, // Not available in Replit
    redis: !isReplit, // Not available in Replit
    dynamodb: !isReplit, // Not available in Replit
    elasticsearch: !isReplit, // Not available in Replit
  };

  return {
    isReplit,
    isDevelopment,
    isProduction,
    availableDatabases,
  };
}

export const ENV_CONFIG = detectEnvironment();

console.log(`Environment detected: ${ENV_CONFIG.isReplit ? 'Replit' : 'Local'}`);
console.log(`Available databases:`, ENV_CONFIG.availableDatabases);