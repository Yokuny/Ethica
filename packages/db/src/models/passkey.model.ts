import type { DeviceKind } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// APA-05/06 (AD-220): passkey of a device (WebAuthn). Every session is born from one; at most one
// per kind (computer and phone) per person — creating another of the same kind replaces it.
export interface PasskeyDocument {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  // WebAuthn credential id (base64url), as the browser sends it back when signing in.
  credentialId: string;
  publicKey: Buffer;
  counter: number;
  transports?: string[];
  kind: DeviceKind;
  // Synced by iCloud/Google (accepted, AD-220).
  backedUp: boolean;
  // Browser and system, for the "devices with access" list (APA-08).
  label: string;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const passkeySchema = new Schema<PasskeyDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    credentialId: { type: String, required: true, unique: true },
    publicKey: { type: Buffer, required: true },
    counter: { type: Number, required: true, default: 0 },
    transports: { type: [String], default: undefined },
    kind: { type: String, enum: ['desktop', 'mobile'], required: true },
    backedUp: { type: Boolean, required: true, default: false },
    label: { type: String, required: true },
    lastUsedAt: { type: Date, required: false },
  },
  { timestamps: true },
);

passkeySchema.index({ user: 1, kind: 1 }, { unique: true });

export const Passkey = mongoose.model<PasskeyDocument>('Passkey', passkeySchema);
