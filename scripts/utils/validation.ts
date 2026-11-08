import { accessSync, constants } from "node:fs";

// Regex patterns defined at top level for performance
const CAMEL_CASE_REGEX = /^[a-z][a-zA-Z0-9]*$/u;
const SNAKE_CASE_REGEX = /^[a-z][a-z0-9-]*$/u;
// lower/digit followed by uppercase: fixedTestPage -> fixed-Test-Page
const LOWER_UPPER_BOUNDARY_REGEX = /(?<lower>[a-z0-9])(?<upper>[A-Z])/gu;
// acronym run followed by word: FAQItem -> FAQ-Item
const ACRONYM_BOUNDARY_REGEX = /(?<acronym>[A-Z]+)(?<word>[A-Z][a-z])/gu;

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
 * Convert camelCase to kebab-case
 */
export function camelToKebab(camelCase: string): string {
  return camelCase

    .replace(LOWER_UPPER_BOUNDARY_REGEX, "$<lower>-$<upper>")
    .replace(ACRONYM_BOUNDARY_REGEX, "$<acronym>-$<word>")
    .toLowerCase();
}

/**
 * Convert camelCase to PascalCase
 */
export function camelToPascal(camelCase: string): string {
  return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
}

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
