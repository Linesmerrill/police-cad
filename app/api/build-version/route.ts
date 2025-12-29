import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const versionPath = join(process.cwd(), 'version.json');
    const versionData = JSON.parse(readFileSync(versionPath, 'utf8'));
    return NextResponse.json({ buildVersion: versionData.version });
  } catch (error) {
    // Fallback if version.json doesn't exist
    return NextResponse.json({ buildVersion: '0.0.0-00:00:00' });
  }
}

