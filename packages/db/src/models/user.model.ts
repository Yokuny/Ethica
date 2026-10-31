import mongoose, { Schema } from 'mongoose';

export interface UserDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  Tenant?: mongoose.Types.ObjectId;
  role: Array<'admin' | 'manager' | 'operator'>;
  isPlatformAdmin: boolean;
  active: boolean;
  // ENR-03: preferências da própria pessoa. Guardam só escolhas de interface
  // (ex.: dispensar o guia de primeiros passos) — nunca fatos de progresso.
  // AD-110: `avisoPrazoEmail` ausente = ligado.
  preferences?: { onboardingDismissed?: boolean; avisoPrazoEmail?: boolean };
  // Feed iCal (PRZ-03): só o hash do token secreto, como sessão e convite. Ausente = sem link.
  calendarFeedTokenHash?: string;
  // ACC-02: foto 256×256 já reduzida no navegador, como data URL. `select: false`:
  // só a rota da foto a lê; listas e sessão levam apenas a versão (avatarUpdatedAt).
  avatar?: string;
  avatarUpdatedAt?: Date;
  // DOC-01: dados profissionais que vão nos documentos técnicos.
  cpf?: string;
  registroProfissional?: string;
  formacao?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, minlength: 3, maxlength: 80, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: false },
    role: { type: [String], enum: ['admin', 'manager', 'operator'], default: [] },
    isPlatformAdmin: { type: Boolean, default: false, required: true },
    active: { type: Boolean, default: true, required: true },
    preferences: {
      type: new Schema(
        { onboardingDismissed: { type: Boolean, default: false }, avisoPrazoEmail: { type: Boolean } },
        { _id: false },
      ),
      required: false,
    },
    avatar: { type: String, select: false, required: false },
    avatarUpdatedAt: { type: Date, required: false },
    calendarFeedTokenHash: { type: String, required: false },
    cpf: { type: String, match: /^\d{11}$/ },
    registroProfissional: { type: String, trim: true },
    formacao: { type: String, trim: true },
  },
  { timestamps: true },
);

// AD-016: Tenant é obrigatório exatamente quando o usuário não é admin da
// plataforma — isPlatformAdmin é a única exceção a ter Tenant ausente.
userSchema.pre('validate', function () {
  if (!this.isPlatformAdmin && !this.Tenant) {
    this.invalidate('Tenant', 'Tenant é obrigatório para usuários que não são admin da plataforma');
  }
});

userSchema.index({ calendarFeedTokenHash: 1 }, { unique: true, sparse: true });

export const User = mongoose.model<UserDocument>('User', userSchema);
