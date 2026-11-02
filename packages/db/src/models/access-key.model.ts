import mongoose, { Schema } from 'mongoose';

// ACE-02 (AD-155): access key sent by e-mail — link token and 6-digit code. Only the
// hashes are saved, like Invite and Session; one live key per e-mail.
export interface AccessKeyDocument {
  _id: mongoose.Types.ObjectId;
  email: string;
  tokenHash: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const accessKeySchema = new Schema<AccessKeyDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    tokenHash: { type: String, required: true, unique: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

accessKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AccessKey = mongoose.model<AccessKeyDocument>('AccessKey', accessKeySchema);
