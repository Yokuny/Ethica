import { z } from 'zod';

// Convenção de tempo (AD-036, AD-103): data de calendário (prazo, vencimento) trafega e
// é gravada como `YYYY-MM-DD` no fuso de exibição; horário de parede como `HH:mm`.
// Instante (início de um compromisso) só existe no servidor, em UTC.
export const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data inválida (YYYY-MM-DD)');
export const wallTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'horário inválido (HH:mm)');
