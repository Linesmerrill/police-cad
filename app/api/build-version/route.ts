import { readFileSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';

// Cache the version to avoid repeated file reads
let cachedVersion: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // Cache for 1 minute

export async function GET() {
  try {
    const versionPath = join(process.cwd(), 'version.json');
    const now = Date.now();
    
    // Check if cache is still valid
    if (cachedVersion && (now - cacheTimestamp) < CACHE_TTL) {
      return NextResponse.json({ buildVersion: cachedVersion });
    }
    
    // Read file and update cache
    const versionData = JSON.parse(readFileSync(versionPath, 'utf8'));
    cachedVersion = versionData.version;
    cacheTimestamp = now;
    
    return NextResponse.json({ buildVersion: cachedVersion });
  } catch (error) {
    // Fallback if version.json doesn't exist
    return NextResponse.json({ buildVersion: '0.0.0-00:00:00' });
  }
}

