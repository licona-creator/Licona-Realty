/**
 * Health Check API Route
 *
 * Simple health check endpoint for monitoring.
 * Does not expose any sensitive information.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}
