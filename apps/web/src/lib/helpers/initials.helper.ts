// Up to two initials of the name for the avatar without a photo: first letter of the first
// and of the last name ("Ana Maria Souza" → "AS"); a single name gives one letter.
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toLocaleUpperCase('pt-BR');
}
