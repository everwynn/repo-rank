export function withBase(path: string): string {
  const raw = import.meta.env.BASE_URL;
  const base = raw.endsWith('/') ? raw : `${raw}/`;
  return `${base}${path.replace(/^\//, '')}`;
}
