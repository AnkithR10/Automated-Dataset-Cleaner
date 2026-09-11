import { NextResponse } from 'next/server';
import { jobsDb } from '@/lib/store';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = jobsDb[jobId];

  if (!job) {
    return new Response('Job not found', { status: 404 });
  }

  if (job.status !== 'Completed' || !job.processedPath) {
    return new Response('Processed file not available', { status: 400 });
  }

  if (!fs.existsSync(job.processedPath)) {
    return new Response('Cleaned file could not be found on server disk', { status: 500 });
  }

  const originalFilename = job.filename || 'dataset.csv';
  const namePart = path.parse(originalFilename).name;
  const extPart = path.parse(originalFilename).ext;
  const downloadFilename = `${namePart}_cleaned${extPart}`;

  const fileBuffer = fs.readFileSync(job.processedPath);

  return new Response(fileBuffer, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${downloadFilename}"`,
    },
  });
}
