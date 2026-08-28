export function normalizePhone(raw: string) {
  return raw.replace(/[^\d+]/g, "");
}
