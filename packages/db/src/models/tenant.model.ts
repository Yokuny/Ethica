import mongoose, { Schema } from 'mongoose';

export type TenantStatus = 'provisioned' | 'active' | 'suspended';

export interface TenantDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  document: string;
  status: TenantStatus;
  // Identidade dos documentos (AD-121): texto com marcadores, trocados na geração do PDF.
  cabecalho?: string;
  rodape?: string;
  // Arquivos no storage S3 (AD-120). `storageBytes` é o total usado, reservado no mesmo
  // update que grava a referência do arquivo, para respeitar a cota do tenant.
  logo?: { key: string; bytes: number; updatedAt: Date };
  storageBytes: number;
  // Modelo do aviso de agendamento às partes (AD-131); sem ele vale o padrão do servidor.
  avisoAgendamento?: { assunto: string; corpo: string };
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<TenantDocument>(
  {
    name: { type: String, minlength: 3, maxlength: 120, required: true },
    document: { type: String, required: true, unique: true, match: /^\d+$/ },
    status: {
      type: String,
      enum: ['provisioned', 'active', 'suspended'],
      default: 'provisioned',
      required: true,
    },
    cabecalho: { type: String, maxlength: 1000 },
    rodape: { type: String, maxlength: 1000 },
    logo: {
      type: new Schema(
        { key: { type: String, required: true }, bytes: { type: Number, required: true }, updatedAt: Date },
        { _id: false },
      ),
      required: false,
    },
    storageBytes: { type: Number, min: 0, default: 0, required: true },
    avisoAgendamento: { type: new Schema({ assunto: String, corpo: String }, { _id: false }) },
  },
  { timestamps: true },
);

export const Tenant = mongoose.model<TenantDocument>('Tenant', tenantSchema);

// A guarda de transição é a própria query: só atualiza se o status atual for
// exatamente `from`. Chamador fora da máquina de estados (from não bate com o
// status real) recebe null — nenhum `if` de regra de negócio aqui.
export const transitionTenantStatus = async (
  id: string,
  from: TenantStatus,
  to: TenantStatus,
): Promise<TenantDocument | null> => {
  return Tenant.findOneAndUpdate({ _id: id, status: from }, { status: to }, { returnDocument: 'after' }).lean();
};
