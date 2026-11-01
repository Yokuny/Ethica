import type {
  CompromissoMotivo,
  CompromissoStatus,
  CompromissoTipo,
  CreateCompromisso,
  UpdateCompromisso,
} from '@ethica/contracts';
import {
  COMPROMISSO_TIPOS,
  calendarDateSchema,
  createCompromissoSchema,
  idSchema,
  updateCompromissoSchema,
} from '@ethica/contracts';
import type { CompromissoOrigem } from '@ethica/db';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { Geocoder } from '../../providers/geocoder.js';
import type { MailProvider } from '../../providers/mail/index.js';

export type { CreateCompromisso, UpdateCompromisso };
export { createCompromissoSchema, updateCompromissoSchema };

export const MAX_RANGE_DAYS = 62;

export const compromissoIdParamSchema = z.object({ id: idSchema }).strict();

// Intervalo [from, to) em datas de calendário do fuso de exibição; a visão de
// mês da agenda pede no máximo 6 semanas.
export const listCompromissosQuerySchema = z
  .object({
    from: calendarDateSchema,
    to: calendarDateSchema,
    tipo: z.enum(COMPROMISSO_TIPOS).optional(),
    caseId: idSchema.optional(),
  })
  .strict()
  .refine((query) => query.from < query.to, { message: 'from precisa ser antes de to', path: ['to'] })
  .refine((query) => Date.parse(query.to) - Date.parse(query.from) <= MAX_RANGE_DAYS * 86_400_000, {
    message: `intervalo máximo de ${MAX_RANGE_DAYS} dias`,
    path: ['to'],
  });
export type ListCompromissosQuery = z.infer<typeof listCompromissosQuerySchema>;

export const upcomingCompromissosQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(20).default(5),
    caseId: idSchema.optional(),
  })
  .strict();
export type UpcomingCompromissosQuery = z.infer<typeof upcomingCompromissosQuerySchema>;

export type AgendaRouterDeps = {
  validToken: RequestHandler;
  storage?: FileStorage;
  mail: MailProvider;
  geocoder: Geocoder;
};

export type CompromissoRecord = {
  id: string;
  tipo: CompromissoTipo;
  titulo: string;
  inicio: Date;
  fim: Date;
  local?: string;
  caseId?: string;
  // Enriquecido pelo service com o número do processo; ausente se a perícia não existe mais.
  caseNumber?: string;
  status: CompromissoStatus;
  origem: CompromissoOrigem;
  observacoes?: string;
  motivo?: CompromissoMotivo;
  // Só quando a geocodificação é do endereço atual (AD-131).
  coordenadas?: { lat: number; lng: number };
  avisos: AvisoAgendamentoRecord[];
  createdAt: Date;
  updatedAt: Date;
};

export type AvisoAgendamentoRecord = { userId: string; at: Date; destinatarios: string[] };

export type CompromissoWrite = {
  tipo?: CompromissoTipo;
  titulo?: string;
  inicio?: Date;
  fim?: Date;
  local?: string;
  caseId?: string;
  status?: CompromissoStatus;
  origem?: CompromissoOrigem;
  observacoes?: string;
  // `null` apaga: o compromisso deixou de estar cancelado.
  motivo?: CompromissoMotivo | null;
};
