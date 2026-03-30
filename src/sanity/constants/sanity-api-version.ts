/**
 * Sanity API version in the format YYYY-MM-DD
 * Used for API versioning in Sanity queries and structure filters
 */
export const sanityApiVersion = new Date().toISOString().split("T")[0];
