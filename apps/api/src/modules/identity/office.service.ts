import { TENANT_STORAGE_QUOTA_BYTES } from '@ethica/contracts';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import * as activityLogService from './activityLog.service.js';
import * as officeRepository from './office.repository.js';
import type { DocumentIdentity, OfficeView, TenantLogo, UpdateOffice, UpdateScheduleNotice } from './office.schema.js';

const EXPORTS_SHOWN = 5;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const findOfficeOrThrow = async (tenantId: string) => {
  const tenant = await officeRepository.findOffice(tenantId);
  if (!tenant) throw new CustomError('not_found', 404);
  return tenant;
};

const requireStorage = (storage: FileStorage | undefined): FileStorage => {
  if (!storage) throw new CustomError('storage_not_configured', 503);
  return storage;
};

export const getOffice = async (tenantId: string): Promise<OfficeView> => {
  const tenant = await findOfficeOrThrow(tenantId);
  // The latest exports come from the activity log (AD-134).
  const exports = await activityLogService.latestExports(tenantId, EXPORTS_SHOWN);
  return {
    header: tenant.header ?? '',
    footer: tenant.footer ?? '',
    ...(tenant.logo ? { logo: `/tenant/office/logo?v=${tenant.logo.updatedAt?.getTime() ?? 0}` } : {}),
    storageBytes: tenant.storageBytes ?? 0,
    storageQuotaBytes: TENANT_STORAGE_QUOTA_BYTES,
    dataExports: exports.map((item) => ({ userName: item.userName, at: item.createdAt })),
  };
};

export const updateOffice = async (tenantId: string, data: UpdateOffice): Promise<OfficeView> => {
  await officeRepository.updateTexts(tenantId, data);
  return getOffice(tenantId);
};

// The new file goes to storage first with its own key; only then the quota is reserved.
// Without quota, the new one is deleted and the current logo stays; on success, the previous one leaves storage.
export const setLogo = async (storage: FileStorage | undefined, tenantId: string, png: Buffer): Promise<OfficeView> => {
  const files = requireStorage(storage);
  if (!png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new CustomError('unsupported_file_type', 415);
  }
  const current = (await findOfficeOrThrow(tenantId)).logo as TenantLogo | undefined;
  const logo = { key: `tenants/${tenantId}/logo/${Date.now()}.png`, bytes: png.length };
  await files.put(logo.key, png, 'image/png');
  if (!(await officeRepository.replaceLogo(tenantId, logo, current))) {
    await files.remove(logo.key);
    throw new CustomError('storage_quota_exceeded', 422);
  }
  if (current) await files.remove(current.key);
  return getOffice(tenantId);
};

export const removeLogo = async (storage: FileStorage | undefined, tenantId: string): Promise<OfficeView> => {
  const files = requireStorage(storage);
  const current = (await findOfficeOrThrow(tenantId)).logo as TenantLogo | undefined;
  if (current) {
    await officeRepository.removeLogo(tenantId, current);
    await files.remove(current.key);
  }
  return getOffice(tenantId);
};

export const getLogo = async (storage: FileStorage | undefined, tenantId: string): Promise<Buffer> => {
  const logo = (await findOfficeOrThrow(tenantId)).logo;
  const bytes = logo && storage ? await storage.get(logo.key) : null;
  if (!bytes) throw new CustomError('not_found', 404);
  return bytes;
};

// For the PDFs (AD-121): without a logo, or without storage configured, the [LOGO] marker is dropped.
export const getDocumentIdentity = async (
  storage: FileStorage | undefined,
  tenantId: string,
): Promise<DocumentIdentity> => {
  const tenant = await findOfficeOrThrow(tenantId);
  const bytes = tenant.logo && storage ? await storage.get(tenant.logo.key) : null;
  return {
    name: tenant.name,
    ...(tenant.header ? { header: tenant.header } : {}),
    ...(tenant.footer ? { footer: tenant.footer } : {}),
    ...(bytes ? { logoDataUrl: `data:image/png;base64,${bytes.toString('base64')}` } : {}),
  };
};

// File quota for other modules (inspection media, AD-129): reserve before saving
// the reference and give back when the file is deleted.
export const reserveFile = async (tenantId: string, bytes: number): Promise<void> => {
  if (!(await officeRepository.reserveBytes(tenantId, bytes))) throw new CustomError('storage_quota_exceeded', 422);
};

export const returnFile = (tenantId: string, bytes: number) => officeRepository.returnBytes(tenantId, bytes);

// Template of the schedule notice to the parties (AD-131); with no saved template, the default applies.
export const DEFAULT_SCHEDULE_NOTICE: UpdateScheduleNotice = {
  subject: 'Aviso de agendamento: [TIPO_EVENTO] - Processo [NUMERO_PROCESSO]',
  body: [
    'Prezados,',
    '',
    'Informo que a [TIPO_EVENTO] do processo [NUMERO_PROCESSO] ([VARA], [COMARCA]) está marcada para [DATA], às [HORA], no endereço [ENDERECO].',
    '',
    'Peço a presença das partes e dos assistentes técnicos, com os documentos pertinentes.',
    '',
    'Atenciosamente,',
    '[NOME_PERITO]',
  ].join('\n'),
};

export const getScheduleNotice = async (tenantId: string): Promise<UpdateScheduleNotice> =>
  (await findOfficeOrThrow(tenantId)).scheduleNotice ?? DEFAULT_SCHEDULE_NOTICE;

export const updateScheduleNotice = async (tenantId: string, notice: UpdateScheduleNotice) => {
  await officeRepository.setScheduleNotice(tenantId, notice);
  return getScheduleNotice(tenantId);
};
