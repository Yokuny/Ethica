const labels: Record<string, string> = {
  more: 'Mais',
  close: 'Fechar',
  loading: 'Carregando…',
  page: 'Página',
  previous_page: 'Página anterior',
  next_page: 'Próxima página',
};
export const t = (key: string) => labels[key] ?? key;
