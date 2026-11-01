import crypto from 'node:crypto';
import type { Permissions } from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';
import { permissionsSchemaDb } from './user.model.js';

export type InviteStatus = 'pending' | 'accepted' | 'revoked';

export interface InviteDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  email: string;
  role: 'admin' | 'manager' | 'operator';
  // Matrix the member gets on acceptance (AD-137); missing for admin.
  permissions?: Permissions;
  tokenHash: string;
  status: InviteStatus;
  expiresAt: Date;
  invitedBy: mongoose.Types.ObjectId;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inviteSchema = new Schema<InviteDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'manager', 'operator'], required: true },
    permissions: { type: permissionsSchemaDb, required: false },
    tokenHash: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending', required: true },
    expiresAt: { type: Date, required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sentAt: { type: Date, required: false },
  },
  { timestamps: true },
);

// Never two `pending` invites for the same Tenant+email pair (FND-13) — the
// invariant belongs to the partial index, not to the code.
inviteSchema.index({ Tenant: 1, email: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });
inviteSchema.index({ Tenant: 1, status: 1 });

export const Invite = mongoose.model<InviteDocument>('Invite', inviteSchema);

// The opaque token is never saved — only the hash. A database leak does not produce
// a usable invite.
export const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex');
