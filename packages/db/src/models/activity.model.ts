import {
  ACTIVITY_LOG_ACTIONS,
  ACTIVITY_LOG_MODULES,
  type ActivityLogAction,
  type ActivityLogModule,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Diário de bordo (AD-134): uma entrada por ação de escrita bem-sucedida, exportação ou
// entrada no sistema. Nome e rótulo são gravados para a entrada sobreviver à exclusão
// do usuário ou do registro.
export interface ActivityDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  User: mongoose.Types.ObjectId;
  userName: string;
  module: ActivityLogModule;
  resource?: string;
  action: ActivityLogAction;
  recordId?: string;
  label?: string;
  createdAt: Date;
}

// Guarda de 1 ano (AD-134): o índice TTL apaga a entrada sozinho.
export const ACTIVITY_TTL_SECONDS = 365 * 24 * 60 * 60;

const activitySchema = new Schema<ActivityDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    User: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    module: { type: String, enum: ACTIVITY_LOG_MODULES, required: true },
    resource: { type: String },
    action: { type: String, enum: ACTIVITY_LOG_ACTIONS, required: true },
    recordId: { type: String },
    label: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activitySchema.index({ Tenant: 1, createdAt: -1 });
activitySchema.index({ Tenant: 1, User: 1, createdAt: -1 });
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: ACTIVITY_TTL_SECONDS });

export const Activity = mongoose.model<ActivityDocument>('Activity', activitySchema);
