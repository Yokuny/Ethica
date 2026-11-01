import { PERMISSION_MODULES, type Permissions } from '@ethica/contracts';
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
  // Member permission matrix (AD-137). Missing = role preset; admin ignores it.
  permissions?: Permissions;
  // ENR-03: the person's own preferences. They only keep interface choices
  // (e.g. dismissing the getting started guide) — never progress facts.
  // AD-110: `avisoPrazoEmail` ausente = ligado.
  preferences?: { onboardingDismissed?: boolean; deadlineReminderEmail?: boolean; hiddenBlocks?: string[] };
  // iCal feed (PRZ-03): only the hash of the secret token, like session and invite. Missing = no link.
  calendarFeedTokenHash?: string;
  // ACC-02: 256×256 photo already shrunk in the browser, as a data URL. `select: false`:
  // only the photo route reads it; lists and session only carry the version (avatarUpdatedAt).
  avatar?: string;
  avatarUpdatedAt?: Date;
  // DOC-01: professional data that goes on the technical documents.
  cpf?: string;
  professionalRegistration?: string;
  education?: string;
  createdAt: Date;
  updatedAt: Date;
}

// One array of actions per module; the shape validation belongs to the contract (permissionsSchema).
export const permissionsSchemaDb = new Schema<Permissions>(
  Object.fromEntries(PERMISSION_MODULES.map((module) => [module, { type: [String], default: undefined }])),
  { _id: false },
);

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, minlength: 3, maxlength: 80, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: false },
    role: { type: [String], enum: ['admin', 'manager', 'operator'], default: [] },
    isPlatformAdmin: { type: Boolean, default: false, required: true },
    active: { type: Boolean, default: true, required: true },
    permissions: { type: permissionsSchemaDb, required: false },
    preferences: {
      type: new Schema(
        {
          onboardingDismissed: { type: Boolean, default: false },
          deadlineReminderEmail: { type: Boolean },
          hiddenBlocks: { type: [String], default: undefined },
        },
        { _id: false },
      ),
      required: false,
    },
    avatar: { type: String, select: false, required: false },
    avatarUpdatedAt: { type: Date, required: false },
    calendarFeedTokenHash: { type: String, required: false },
    cpf: { type: String, match: /^\d{11}$/ },
    professionalRegistration: { type: String, trim: true },
    education: { type: String, trim: true },
  },
  { timestamps: true },
);

// AD-016: Tenant is required exactly when the user is not a platform
// admin — isPlatformAdmin is the only exception allowed to have no Tenant.
userSchema.pre('validate', function () {
  if (!this.isPlatformAdmin && !this.Tenant) {
    this.invalidate('Tenant', 'Tenant é obrigatório para usuários que não são admin da plataforma');
  }
});

userSchema.index({ calendarFeedTokenHash: 1 }, { unique: true, sparse: true });

export const User = mongoose.model<UserDocument>('User', userSchema);
