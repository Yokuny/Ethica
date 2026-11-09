import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import type { FileStorage } from '../../providers/fileStorage.js';
import type { AccountView } from '../identity/account.schema.js';
import type { DocumentIdentity } from '../identity/office.schema.js';
import * as officeService from '../identity/office.service.js';
import * as signatoryRepository from './signatory.repository.js';
import type { SignatoryInput, SignatoryRecord } from './signatory.schema.js';

export class SignatoryNotFoundError extends KeyedError {}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const found = async (tenantId: string, id: string) => {
  const signatory = await signatoryRepository.findById(tenantId, id);
  if (!signatory) throw new SignatoryNotFoundError('not_found');
  return signatory;
};

export const getSignatory = async (tenantId: string, id: string): Promise<void> => {
  await found(tenantId, id);
};

export const listSignatories = (tenantId: string) => signatoryRepository.list(tenantId);

export const createSignatory = (tenantId: string, data: SignatoryInput) => signatoryRepository.create(tenantId, data);

export const updateSignatory = async (tenantId: string, id: string, data: SignatoryInput): Promise<SignatoryRecord> => {
  const updated = await signatoryRepository.update(tenantId, id, data);
  if (!updated) throw new SignatoryNotFoundError('not_found');
  return updated;
};

// The logo leaves storage and gives the quota back (AD-120). A report signed by them falls back to its creator.
export const deleteSignatory = async (storage: FileStorage | undefined, tenantId: string, id: string) => {
  const removed = await signatoryRepository.remove(tenantId, id);
  if (!removed) throw new SignatoryNotFoundError('not_found');
  if (removed.logo) {
    await storage?.remove(removed.logo.key).catch(() => undefined);
    await officeService.returnFile(tenantId, removed.logo.bytes);
  }
};

// Same path as the office logo (DOC-01): PNG already shrunk in the browser, with the quota reserved first.
export const setLogo = async (storage: FileStorage | undefined, tenantId: string, id: string, png: Buffer) => {
  if (!storage) throw new CustomError('storage_not_configured', 503);
  if (!png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new CustomError('unsupported_file_type', 415);
  }
  const current = (await found(tenantId, id)).logo;
  const logo = { key: `tenants/${tenantId}/signatories/${id}/${Date.now()}.png`, bytes: png.length };
  await officeService.reserveFile(tenantId, logo.bytes);
  try {
    await storage.put(logo.key, png, 'image/png');
    await signatoryRepository.setLogo(tenantId, id, logo);
  } catch (error) {
    await officeService.returnFile(tenantId, logo.bytes);
    throw error;
  }
  if (current) {
    await storage.remove(current.key).catch(() => undefined);
    await officeService.returnFile(tenantId, current.bytes);
  }
};

export const removeLogo = async (storage: FileStorage | undefined, tenantId: string, id: string) => {
  const current = (await found(tenantId, id)).logo;
  if (!current) return;
  await signatoryRepository.setLogo(tenantId, id, null);
  await storage?.remove(current.key).catch(() => undefined);
  await officeService.returnFile(tenantId, current.bytes);
};

export const getLogo = async (storage: FileStorage | undefined, tenantId: string, id: string): Promise<Buffer> => {
  const logo = (await found(tenantId, id)).logo;
  const bytes = logo && storage ? await storage.get(logo.key) : null;
  if (!bytes) throw new SignatoryNotFoundError('not_found');
  return bytes;
};

// Who signs the report (NLA-02): the registered responsible, with header, footer and logo of their own
// over the office ones. `null`: the registry was deleted; the report falls back to its creator.
export const documentSigner = async (
  storage: FileStorage | undefined,
  tenantId: string,
  id: string,
  office: DocumentIdentity,
): Promise<{ expert: AccountView; identity: DocumentIdentity } | null> => {
  const signatory = await signatoryRepository.findById(tenantId, id);
  if (!signatory) return null;
  const logo = signatory.logo && storage ? await storage.get(signatory.logo.key) : null;
  return {
    expert: {
      name: signatory.name,
      cpf: signatory.cpf,
      professionalRegistration: signatory.professionalRegistration,
      education: signatory.education,
      phone: signatory.phone,
    },
    identity: {
      ...office,
      ...(signatory.header ? { header: signatory.header } : {}),
      ...(signatory.footer ? { footer: signatory.footer } : {}),
      ...(logo ? { logoDataUrl: `data:image/png;base64,${logo.toString('base64')}` } : {}),
    },
  };
};
