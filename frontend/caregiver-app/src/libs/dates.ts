/** FastAPI sends naive UTC datetimes with no offset; JS would read them as local time. */
export function toUtcIso(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.includes('T')) return value; // date-only (e.g. date_of_birth): leave alone
  return /([zZ]|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
}