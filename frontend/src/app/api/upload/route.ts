import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import path from 'path';
import fs from 'fs';
import Papa from 'papaparse';

// In-memory store for jobs. Note: In a true multi-instance serverless 
// environment, you should use Vercel Blob, Redis, or Firestore.
export const jobsDb: Record<string, any> = {};

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ detail: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ detail: 'Invalid file format. Only CSV files (.csv) are supported.' }, { status: 400 });
    }

    const jobId = uuidv4();
    const tmpDir = os.tmpdir();
    const uniqueFilename = `${jobId}.csv`;
    const destinationPath = path.join(tmpDir, uniqueFilename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(destinationPath, buffer);

    // Preview
    const fileContent = fs.readFileSync(destinationPath, 'utf-8');
    const parsed = Papa.parse(fileContent, {
      header: true,
      preview: 10,
      skipEmptyLines: true,
    });

    const previewColumns = parsed.meta.fields || [];
    const previewRows = parsed.data || [];

    jobsDb[jobId] = {
      status: 'Pending',
      filePath: destinationPath,
      processedPath: null,
      error: null,
      filename: file.name,
    };

    return NextResponse.json({
      job_id: jobId,
      status: 'Pending',
      filename: file.name,
      preview_columns: previewColumns,
      preview_rows: previewRows,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ detail: `Failed to process upload: ${error.message}` }, { status: 500 });
  }
}
