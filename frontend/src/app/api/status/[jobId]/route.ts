import { NextResponse } from 'next/server';
import { jobsDb } from '@/lib/store';

export async function GET(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = jobsDb[jobId];

  if (!job) {
    return NextResponse.json({ detail: 'Job not found' }, { status: 404 });
  }

  const response: any = {
    job_id: jobId,
    status: job.status,
  };

  if (job.status === 'Completed') {
    response.processed = true;
    response.download_url = `/api/download/${jobId}`;
    response.xai_insights = job.xai_insights || {};
    response.recommendations = job.recommendations || [];
  } else if (job.status === 'Failed') {
    response.processed = false;
    response.error = job.error || 'Unknown processing error';
  }

  return NextResponse.json(response);
}
