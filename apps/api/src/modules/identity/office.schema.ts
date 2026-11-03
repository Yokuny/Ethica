import type { DocumentTextStyle, UpdateOffice, UpdateScheduleNotice } from '@ethica/contracts';
import { updateOfficeSchema, updateScheduleNoticeSchema } from '@ethica/contracts';
import type { RequestHandler } from 'express';
import type { FileStorage } from '../../providers/fileStorage.js';

export type { UpdateOffice, UpdateScheduleNotice };
export { updateOfficeSchema, updateScheduleNoticeSchema };

export type OfficeRouterDeps = { validToken: RequestHandler; storage?: FileStorage };

// Office configuration for the admin (DOC-01, DOC-04). `logo` is the versioned path
// of GET /tenant/office/logo, missing without a logo.
export type OfficeView = {
  header: string;
  footer: string;
  headerStyle: DocumentTextStyle;
  footerStyle: DocumentTextStyle;
  logo?: string;
  storageBytes: number;
  storageQuotaBytes: number;
  dataExports: Array<{ userName?: string; at: Date }>;
};

export type TenantLogo = { key: string; bytes: number; updatedAt?: Date };

// Identity used when generating the PDFs (AD-121): the logo already as a data URL; the style of the
// header and footer is always the office one (AD-172).
export type DocumentIdentity = {
  name: string;
  header?: string;
  footer?: string;
  headerStyle: DocumentTextStyle;
  footerStyle: DocumentTextStyle;
  logoDataUrl?: string;
};
