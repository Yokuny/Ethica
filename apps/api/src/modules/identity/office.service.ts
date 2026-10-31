import { TENANT_STORAGE_QUOTA_BYTES } from '@ethica/contracts';
import { CustomError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import * as authRepository from './auth.repository.js';
import * as officeRepository from './office.repository.js';
import type { DocumentIdentity, OfficeView, TenantLogo, UpdateOffice } from './office.schema.js';

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
  const exports = [...(tenant.dataExports ?? [])].reverse();
  const names = await authRepository.findUserNamesByIds(tenantId, [
    ...new Set(exports.map((item) => item.User.toString())),
  ]);
  const nameOf = new Map(names.map((user) => [user.id, user.name]));
  return {
    cabecalho: tenant.cabecalho ?? '',
    rodape: tenant.rodape ?? '',
    ...(tenant.logo ? { logo: `/tenant/office/logo?v=${tenant.logo.updatedAt?.getTime() ?? 0}` } : {}),
    storageBytes: tenant.storageBytes ?? 0,
    storageQuotaBytes: TENANT_STORAGE_QUOTA_BYTES,
    dataExports: exports.map((item) => {
      const userName = nameOf.get(item.User.toString());
      return userName ? { userName, at: item.at } : { at: item.at };
    }),
  };
};

export const updateOffice = async (tenantId: string, data: UpdateOffice): Promise<OfficeView> => {
  await officeRepository.updateTexts(tenantId, data);
  return getOffice(tenantId);
};

// O arquivo novo vai primeiro para o storage com chave própria; só depois a cota é reservada.
// Sem cota, o novo é apagado e o logo atual fica; com sucesso, o anterior sai do storage.
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

// Para os PDFs (AD-121): sem logo, ou sem storage configurado, o marcador [LOGO] some.
export const getDocumentIdentity = async (
  storage: FileStorage | undefined,
  tenantId: string,
): Promise<DocumentIdentity> => {
  const tenant = await findOfficeOrThrow(tenantId);
  const bytes = tenant.logo && storage ? await storage.get(tenant.logo.key) : null;
  return {
    name: tenant.name,
    ...(tenant.cabecalho ? { cabecalho: tenant.cabecalho } : {}),
    ...(tenant.rodape ? { rodape: tenant.rodape } : {}),
    ...(bytes ? { logoDataUrl: `data:image/png;base64,${bytes.toString('base64')}` } : {}),
  };
};

export const registrarExportacao = (tenantId: string, userId: string) =>
  officeRepository.pushDataExport(tenantId, userId);
