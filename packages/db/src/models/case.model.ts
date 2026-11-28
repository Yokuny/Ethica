import {
  CASE_PHASES,
  CASE_STATUS,
  type CasePhase,
  type CaseStatus,
  COURTTYPES,
  type CourtType,
  casePhases,
  defaultPhase,
  MOVEMENT_TYPES,
  type MovementType,
  PARTY_TYPES,
  type PartyType,
  SERVICE_TYPES,
  type ServiceType,
  SIDES,
  type Side,
} from '@ethica/contracts';
import mongoose, { Schema } from 'mongoose';

// Party linked to the case. `type` and `name` are a copy of the registry (AD-117): the listing
// search and the feed/reminder summary read from here; renaming the party updates the copy.
export interface CasePartyDocument {
  Party: mongoose.Types.ObjectId;
  side: Side;
  type: PartyType;
  name: string;
  // Whoever hired the technical assistant (AD-135).
  client?: boolean;
}

// Process movement that counts for the stalled case (AD-121). Date `YYYY-MM-DD`.
export interface CaseMovementDocument {
  _id: mongoose.Types.ObjectId;
  type: MovementType;
  date: string;
  notes?: string;
}

export interface CaseContractorDocument {
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
}

// File attached to the service (SPA-03), in the tenant storage (AD-120).
export interface CaseAttachmentDocument {
  _id: mongoose.Types.ObjectId;
  key: string;
  name: string;
  mime: string;
  bytes: number;
}

export interface CaseDocument {
  _id: mongoose.Types.ObjectId;
  Tenant: mongoose.Types.ObjectId;
  // Only in a perícia (AD-158).
  processNumber?: string;
  // Service order control number (NLA-01).
  serviceOrder?: string;
  // Sphere, only in a perícia (AD-178).
  courtType?: CourtType;
  serviceType: ServiceType;
  contractor?: CaseContractorDocument;
  court?: string;
  division?: string;
  district?: string;
  subject: string;
  parties: CasePartyDocument[];
  phase: CasePhase;
  status: CaseStatus;
  // Calendar dates `YYYY-MM-DD` in the display time zone (AD-036, AD-103), not instants.
  nominationDate?: string;
  proposedFeesCents?: number;
  fixedFeesCents?: number;
  notes?: string;
  folderUrl?: string;
  attachments: CaseAttachmentDocument[];
  // Labor report auxiliary data (IMP-04); dates `YYYY-MM-DD` (AD-103).
  docketingDate?: string;
  hireDate?: string;
  terminationDate?: string;
  claimantJob?: string;
  nonPrescribedPeriodStart?: string;
  nonPrescribedPeriodEnd?: string;
  location?: string;
  movements: CaseMovementDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const caseSchema = new Schema<CaseDocument>(
  {
    Tenant: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    processNumber: { type: String, trim: true },
    serviceOrder: { type: String, trim: true },
    courtType: { type: String, enum: COURTTYPES },
    serviceType: { type: String, enum: SERVICE_TYPES, required: true },
    contractor: {
      type: new Schema<CaseContractorDocument>(
        {
          name: { type: String, required: true, trim: true },
          document: { type: String, trim: true },
          phone: { type: String, trim: true },
          email: { type: String, trim: true },
          address: { type: String, trim: true },
        },
        { _id: false },
      ),
    },
    court: { type: String, trim: true },
    division: { type: String, trim: true },
    district: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    parties: {
      type: [
        new Schema<CasePartyDocument>(
          {
            Party: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
            side: { type: String, enum: SIDES, required: true },
            type: { type: String, enum: PARTY_TYPES, required: true },
            name: { type: String, required: true, trim: true },
            client: { type: Boolean },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    phase: { type: String, enum: CASE_PHASES, required: true },
    status: { type: String, enum: CASE_STATUS, default: 'active', required: true },
    nominationDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    proposedFeesCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    fixedFeesCents: { type: Number, min: 0, validate: Number.isSafeInteger },
    notes: { type: String },
    folderUrl: { type: String, trim: true },
    attachments: {
      type: [
        new Schema<CaseAttachmentDocument>({
          key: { type: String, required: true },
          name: { type: String, required: true, trim: true },
          mime: { type: String, required: true },
          bytes: { type: Number, required: true },
        }),
      ],
      default: [],
    },
    docketingDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    hireDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    terminationDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    claimantJob: { type: String, trim: true },
    nonPrescribedPeriodStart: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    nonPrescribedPeriodEnd: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    location: { type: String, trim: true },
    movements: {
      type: [
        new Schema<CaseMovementDocument>({
          type: { type: String, enum: MOVEMENT_TYPES, required: true },
          date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
          notes: { type: String, trim: true },
        }),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// A process shows up once per tenant: the expert cannot register the same
// nomination twice (the index guarantees it, not the code). Services without a number are not counted (AD-158).
caseSchema.index(
  { Tenant: 1, processNumber: 1 },
  { unique: true, partialFilterExpression: { processNumber: { $type: 'string' } } },
);
// One service order number per tenant (NLA-01); services without one are not counted.
caseSchema.index(
  { Tenant: 1, serviceOrder: 1 },
  { unique: true, partialFilterExpression: { serviceOrder: { $type: 'string' } } },
);
caseSchema.index({ Tenant: 1, serviceType: 1 });
caseSchema.index({ Tenant: 1, status: 1 });
caseSchema.index({ Tenant: 1, phase: 1 });
caseSchema.index({ Tenant: 1, createdAt: -1 });
// Cases of a party (IMP-03) and name copy on rename.
caseSchema.index({ Tenant: 1, 'parties.Party': 1 });

export const Case = mongoose.model<CaseDocument>('Case', caseSchema);

// Data conversion on API boot (AD-310); idempotent: once converted nothing matches. The service saved with a
// role, a typed type name, a typed role or a typed phase becomes the four service types and the fixed phases; the
// typed role goes to the notes.
const TYPED_PHASES: [RegExp, CasePhase][] = [
  [/finaliz|conclu|encerr/i, 'finished'],
  [/entreg/i, 'delivered'],
  [/contratad/i, 'hired'],
  [/receb|pago/i, 'fees_received'],
];
const RENAMED_PHASES: Record<string, CasePhase> = { assistance_closed: 'finished', assistance_hired: 'hired' };
const SERVICE_TYPE_OF_ROLE: Record<string, ServiceType> = {
  court_expert: 'expert_examination',
  technical_assistant: 'technical_assistance',
};

export const migrateCases = async (): Promise<void> => {
  const cases = Case.collection;
  const legacy = await cases
    .find({ $or: [{ role: { $exists: true } }, { serviceType: { $nin: [...SERVICE_TYPES] } }] })
    .project<{
      _id: mongoose.Types.ObjectId;
      role?: string;
      roleName?: string;
      serviceType?: string;
      phase?: string;
      phaseName?: string;
      notes?: string;
    }>({ role: 1, roleName: 1, serviceType: 1, phase: 1, phaseName: 1, notes: 1 })
    .toArray();
  for (const doc of legacy) {
    const serviceType: ServiceType = SERVICE_TYPES.includes(doc.serviceType as ServiceType)
      ? (doc.serviceType as ServiceType)
      : doc.serviceType
        ? /particular/i.test(doc.serviceType)
          ? 'private_service'
          : 'partnership'
        : (SERVICE_TYPE_OF_ROLE[doc.role ?? ''] ?? 'expert_examination');
    const phases = casePhases(serviceType);
    const typed = doc.phase === 'custom' ? (doc.phaseName ?? '') : undefined;
    const phase =
      typed !== undefined
        ? (TYPED_PHASES.find(([pattern]) => pattern.test(typed))?.[1] ?? 'in_progress')
        : (RENAMED_PHASES[doc.phase ?? ''] ?? (doc.phase as CasePhase));
    const notes = [doc.notes, doc.roleName && `Atuação: ${doc.roleName}`].filter(Boolean).join('\n');
    await cases.updateOne(
      { _id: doc._id },
      {
        $set: {
          serviceType,
          phase: phases.includes(phase) ? phase : defaultPhase(serviceType),
          ...(notes ? { notes } : {}),
        },
        $unset: {
          role: '',
          roleName: '',
          phaseName: '',
          ...(serviceType === 'expert_examination' ? {} : { courtType: '' }),
        },
      },
    );
  }
};
