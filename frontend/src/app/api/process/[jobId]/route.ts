import { NextResponse } from 'next/server';
import { jobsDb } from '@/lib/store';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

export async function POST(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params;
    const job = jobsDb[jobId];

    if (!job) {
      return NextResponse.json({ detail: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'Processing') {
      return NextResponse.json({ detail: 'Already processing' }, { status: 400 });
    }

    const body = await req.json();
    const { missing_values, remove_duplicates, standardize_types } = body;

    job.status = 'Processing';

    // Since this is a serverless function, we do the processing inline.
    // PapaParse handles parsing nicely.
    const fileContent = fs.readFileSync(job.filePath, 'utf-8');
    const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
    
    let data: any[] = parsed.data;
    let fields: string[] = parsed.meta.fields || [];

    // 1. Remove duplicates
    if (remove_duplicates) {
      const seen = new Set();
      data = data.filter(row => {
        const rowStr = JSON.stringify(row);
        if (seen.has(rowStr)) return false;
        seen.add(rowStr);
        return true;
      });
    }

    // 2. Standardize column names
    if (body.standardize_column_names !== false) { // Default true for this app
      const newFields = fields.map(f => {
        return String(f)
          .trim()
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[-\s]+/g, '_')
          .replace(/^_+|_+$/g, '') || 'col';
      });
      // Map data keys to new fields
      data = data.map(row => {
        const newRow: any = {};
        fields.forEach((oldF, idx) => {
          newRow[newFields[idx]] = row[oldF];
        });
        return newRow;
      });
      fields = newFields;
    }

    // 3. Trim whitespaces
    if (standardize_types) {
      data = data.map(row => {
        const newRow: any = {};
        for (const key of fields) {
          if (typeof row[key] === 'string') {
            newRow[key] = row[key].trim();
          } else {
            newRow[key] = row[key];
          }
        }
        return newRow;
      });
    }

    // 4. Missing values
    if (missing_values && missing_values !== 'none') {
      if (missing_values === 'drop') {
        data = data.filter(row => {
          return !fields.some(f => row[f] === null || row[f] === undefined || row[f] === '');
        });
      } else {
        // Calculate mean/median/mode per column
        for (const f of fields) {
          const values = data.map(r => r[f]).filter(v => v !== null && v !== undefined && v !== '');
          const isNumeric = values.every(v => !isNaN(Number(v)));
          
          if (isNumeric && values.length > 0) {
            const numValues = values.map(v => Number(v)).sort((a, b) => a - b);
            let fillValue: string | number = '';

            if (missing_values === 'mean') {
              fillValue = numValues.reduce((a, b) => a + b, 0) / numValues.length;
            } else if (missing_values === 'median') {
              const mid = Math.floor(numValues.length / 2);
              fillValue = numValues.length % 2 !== 0 ? numValues[mid] : (numValues[mid - 1] + numValues[mid]) / 2;
            } else if (missing_values === 'mode') {
              // Simple mode
              const counts = numValues.reduce((acc: any, val) => {
                acc[val] = (acc[val] || 0) + 1;
                return acc;
              }, {});
              fillValue = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            }
            
            // Fill
            data.forEach(row => {
              if (row[f] === null || row[f] === undefined || row[f] === '') {
                row[f] = fillValue;
              }
            });
          } else if (missing_values === 'mode' && values.length > 0) {
            // Mode for strings
            const counts = values.reduce((acc: any, val) => {
              acc[val] = (acc[val] || 0) + 1;
              return acc;
            }, {});
            const modeVal = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            data.forEach(row => {
              if (row[f] === null || row[f] === undefined || row[f] === '') {
                row[f] = modeVal;
              }
            });
          } else {
            // Fallback
            data.forEach(row => {
              if (row[f] === null || row[f] === undefined || row[f] === '') {
                row[f] = 'Unknown';
              }
            });
          }
        }
      }
    }

    // Export processed file
    const processedCsv = Papa.unparse({ fields, data });
    const dirName = path.dirname(job.filePath);
    const baseName = path.basename(job.filePath, '.csv');
    const processedPath = path.join(dirName, `${baseName}_processed.csv`);
    
    fs.writeFileSync(processedPath, processedCsv);

    job.processedPath = processedPath;
    job.status = 'Completed';

    // Mock XAI insights to replace backend behavior
    job.xai_insights = {
      correlation_insight: "Serverless mock XAI insight generated.",
      summary: "Data cleaned successfully via serverless process.",
      important_features: fields.slice(0, 3)
    };
    job.recommendations = []; // To be generated by chat/message

    return NextResponse.json({
      job_id: jobId,
      status: 'Processing',
      message: 'Dataset processed inline.'
    }, { status: 202 });

  } catch (err: any) {
    console.error(err);
    const p = await params;
    if (p.jobId && jobsDb[p.jobId]) {
      jobsDb[p.jobId].status = 'Failed';
      jobsDb[p.jobId].error = err.message;
    }
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
