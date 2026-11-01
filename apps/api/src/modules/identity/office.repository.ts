import { TENANT_STORAGE_QUOTA_BYTES } from '@ethica/contracts';
import { Tenant } from '@ethica/db';
import { withDbTiming } from '../../metrics/db.metric.js';
import type { TenantLogo, UpdateOffice } from './office.schema.js';

export const findOffice = async (tenantId: string) =>
  withDbTiming('office.findOffice', async () =>
    Tenant.findById(tenantId).select('name header footer logo storageBytes scheduleNotice').lean(),
  );

// Texto vazio apaga o cabeçalho/rodapé: os documentos voltam ao padrão.
export const updateTexts = async (tenantId: string, data: UpdateOffice): Promise<void> =>
  withDbTiming('office.updateTexts', async () => {
    const entries = Object.entries(data);
    const $set = Object.fromEntries(entries.filter(([, value]) => value));
    const $unset = Object.fromEntries(entries.filter(([, value]) => !value).map(([key]) => [key, 1]));
    await Tenant.updateOne(
      { _id: tenantId },
      { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) },
    );
  });

// Troca o logo reservando a diferença de tamanho na cota (AD-120). A condição sobre o logo
// atual impede que duas trocas simultâneas contem errado. `false`: a cota não comporta.
export const replaceLogo = async (tenantId: string, logo: TenantLogo, current?: TenantLogo): Promise<boolean> =>
  withDbTiming('office.replaceLogo', async () => {
    const delta = logo.bytes - (current?.bytes ?? 0);
    const result = await Tenant.updateOne(
      {
        _id: tenantId,
        storageBytes: { $lte: TENANT_STORAGE_QUOTA_BYTES - delta },
        ...(current ? { 'logo.key': current.key } : { logo: { $exists: false } }),
      },
      { $set: { logo: { ...logo, updatedAt: new Date() } }, $inc: { storageBytes: delta } },
    );
    return result.modifiedCount === 1;
  });

export const removeLogo = async (tenantId: string, current: TenantLogo): Promise<void> =>
  withDbTiming('office.removeLogo', async () => {
    await Tenant.updateOne(
      { _id: tenantId, 'logo.key': current.key },
      { $unset: { logo: 1 }, $inc: { storageBytes: -current.bytes } },
    );
  });

// Arquivo novo de outro módulo (mídia da vistoria, AD-129) reserva o espaço na cota no mesmo
// update que confere o limite. `false`: a cota não comporta.
export const reservarBytes = async (tenantId: string, bytes: number): Promise<boolean> =>
  withDbTiming('office.reservarBytes', async () => {
    const result = await Tenant.updateOne(
      { _id: tenantId, storageBytes: { $lte: TENANT_STORAGE_QUOTA_BYTES - bytes } },
      { $inc: { storageBytes: bytes } },
    );
    return result.modifiedCount === 1;
  });

export const devolverBytes = async (tenantId: string, bytes: number): Promise<void> =>
  withDbTiming('office.devolverBytes', async () => {
    await Tenant.updateOne({ _id: tenantId }, { $inc: { storageBytes: -bytes } });
  });

export const setScheduleNotice = async (tenantId: string, notice: { subject: string; body: string }) =>
  withDbTiming('office.setScheduleNotice', async () => {
    await Tenant.updateOne({ _id: tenantId }, { $set: { scheduleNotice: notice } });
  });
