import type { UpdateOffice, UpdateScheduleNotice } from '@ethica/contracts';
import { updateOfficeSchema, updateScheduleNoticeSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import type { FileStorage } from '../../providers/fileStorage.js';

export type { UpdateOffice, UpdateScheduleNotice };
export { updateOfficeSchema, updateScheduleNoticeSchema };

export type OfficeRouterDeps = { validToken: RequestHandler; storage?: FileStorage };

// Configuração do escritório para o admin (DOC-01, DOC-04). `logo` é o caminho versionado
// de GET /tenant/office/logo, ausente sem logo.
export type OfficeView = {
  cabecalho: string;
  rodape: string;
  logo?: string;
  storageBytes: number;
  storageQuotaBytes: number;
  dataExports: Array<{ userName?: string; at: Date }>;
};

export type TenantLogo = { key: string; bytes: number; updatedAt?: Date };

// Identidade usada na geração dos PDFs (AD-121): o logo já em data URL.
export type DocumentIdentity = { name: string; cabecalho?: string; rodape?: string; logoDataUrl?: string };
