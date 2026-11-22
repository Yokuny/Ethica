import { REPORT_DELIVERY_TITLE, SERVICE_DELIVERY_TITLE } from '@ethica/contracts';
import { CalendarEntry, connect, disconnect, Notification, type NotificationDocument } from '@ethica/db';
import { env } from '../src/config/env.config.js';

// One-off script (D8, AD-263): copies the old `deadlines` collection into `notifications` (kinds `deadline` and
// `alert`, keeping the same _id) and points their agenda entries to the `notification` origin. Idempotent:
// running twice changes nothing. Without `--apply` it only reports what it would do. Deleted in the commit after
// it runs in production (no shim in the code). The old `deadlines` collection is NOT deleted here.
const apply = process.argv.includes('--apply');
const DELIVERY = new Set([REPORT_DELIVERY_TITLE, SERVICE_DELIVERY_TITLE]);

type OldDeadline = {
  _id: NotificationDocument['_id'];
  Tenant: NotificationDocument['Tenant'];
  Case: NotificationDocument['Tenant'];
  kind?: 'deadline' | 'alert';
  title: string;
  dueDate: string;
  status: 'pending' | 'filed' | 'missed' | 'done';
  filedDate?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const run = async (): Promise<void> => {
  await connect(env.MONGODB_URI);
  const old = (await Notification.db.collection('deadlines').find({}).toArray()) as unknown as OldDeadline[];
  const existing = new Set(
    (await Notification.find({ _id: { $in: old.map((doc) => doc._id) } }, { _id: 1 }).lean()).map((doc) =>
      String(doc._id),
    ),
  );
  const missing = old.filter((doc) => !existing.has(String(doc._id)));
  const docs = missing.map((doc) => ({
    _id: doc._id,
    Tenant: doc.Tenant,
    Case: doc.Case,
    kind: doc.kind ?? 'deadline',
    module: 'expert_cases' as const,
    source: DELIVERY.has(doc.title) ? ('system' as const) : ('user' as const),
    status: doc.status,
    title: doc.title,
    dueDate: doc.dueDate,
    ...(doc.filedDate ? { filedDate: doc.filedDate } : {}),
    ...(doc.notes ? { notes: doc.notes } : {}),
    readBy: [],
    createdAt: doc.createdAt ?? new Date(),
    updatedAt: doc.updatedAt ?? new Date(),
  }));
  const entries = await CalendarEntry.collection.countDocuments({ source: 'deadline' });

  console.log(
    JSON.stringify({ event: 'migrate_deadlines.plan', apply, deadlines: old.length, toCopy: docs.length, entries }),
  );
  if (apply) {
    // Validated by the model (kind × required fields), timestamps kept as they were.
    for (const doc of docs) await new Notification(doc).save({ timestamps: false });
    const moved = await CalendarEntry.collection.updateMany(
      { source: 'deadline' },
      { $set: { source: 'notification' } },
    );
    console.log(JSON.stringify({ event: 'migrate_deadlines.done', copied: docs.length, entries: moved.modifiedCount }));
  }
  await disconnect();
};

void run();
