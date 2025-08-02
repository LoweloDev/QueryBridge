// Universal Query Translator Library
// Main exports for the standalone library

export { QueryParser } from './query-parser';
export { QueryTranslator } from './query-translator';
export { ConnectionManager } from './connection-manager';

// Types and schemas
export * from './types';

// Re-export commonly used types
export type {
  QueryLanguage,
  DatabaseConnection,
  DatabaseType,
  ActiveConnection,
  QueryResult,
  TranslationResult
} from './types';