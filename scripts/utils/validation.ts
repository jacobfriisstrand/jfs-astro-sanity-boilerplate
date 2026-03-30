// Regex patterns defined at top level for performance
const CAMEL_CASE_REGEX = /^[a-z][a-zA-Z0-9]*$/;
const SNAKE_CASE_REGEX = /^[a-z][a-z0-9-]*$/;

/**
 * Validate camelCase format
 */
export function isValidCamelCase(name: string): boolean {
  // Must start with lowercase letter, can contain letters and numbers
  return CAMEL_CASE_REGEX.test(name);
}

/**
 * Validate snake-case format
 */
export function isValidSnakeCase(fileName: string): boolean {
  // Must contain only lowercase letters, numbers, and hyphens
  // Must start with a letter
  return SNAKE_CASE_REGEX.test(fileName);
}

/**
 * Convert camelCase to PascalCase
 */
export function camelToPascal(camelCase: string): string {
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

import { accessSync, constants } from "node:fs";

/**
 * Check if a file exists
 */
export function fileExists(filePath: string): boolean {
  try {
    accessSync(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
