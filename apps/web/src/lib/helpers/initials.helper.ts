// Até duas iniciais do nome para o avatar sem foto: primeira letra do primeiro
// e do último nome ("Ana Maria Souza" → "AS"); nome único dá uma letra.
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return `${first}${last}`.toLocaleUpperCase('pt-BR');
}
