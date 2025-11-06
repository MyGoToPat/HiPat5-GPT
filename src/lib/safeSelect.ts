/**
 * SAFE SELECT WRAPPER
 * Prevents malformed select queries that cause 400 errors
 */
export function safeSelect(columns: string): string {
  if (!columns || typeof columns !== 'string') {
    throw new Error(`Invalid select columns: ${columns}`);
  }
  
  if (/:[\d]+/.test(columns)) {
    console.error('[safeSelect] Invalid numeric alias detected:', columns);
    throw new Error(`Invalid select alias (numeric detected): ${columns}`);
  }
  
  if (!/^[a-zA-Z0-9_.*,()!>\-\s]+$/.test(columns)) {
    console.error('[safeSelect] Invalid characters in select:', columns);
    throw new Error(`Invalid characters in select columns: ${columns}`);
  }
  
  return columns;
}
