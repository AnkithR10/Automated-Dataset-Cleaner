// In-memory store for jobs.
// Note: In a true multi-instance serverless environment, you should use Vercel Blob, Redis, or Firestore.
// We use a global variable to persist across HMR in Next.js development.
const globalAny: any = global;

if (!globalAny.jobsDb) {
  globalAny.jobsDb = {};
}

export const jobsDb: Record<string, any> = globalAny.jobsDb;
