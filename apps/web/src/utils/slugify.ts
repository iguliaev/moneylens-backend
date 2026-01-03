/**
 * Convert a string to a slugified format suitable for test IDs and identifiers
 * e.g. "My Tag Name" → "my-tag-name"
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
