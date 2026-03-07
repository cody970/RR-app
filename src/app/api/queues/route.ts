import { NextRequest, NextResponse } from 'next/server';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';

// Create queues
const auditQueue = new Queue('audit-jobs', { connection: redis });
const scanQueue = new Queue('scan-jobs', { connection: redis });

// Create Bull Board adapters
const auditAdapter = new BullMQAdapter(auditQueue);
const scanAdapter = new BullMQAdapter(scanQueue);

// Server adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/queues');

createBullBoard({
  queues: [auditAdapter, scanAdapter],
  serverAdapter,
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname.replace('/api/queues', '');
  
  // Proxy to Bull Board
  const response = await fetch(`http://localhost:3000/api/queues${path}`, {
    method: req.method,
    headers: req.headers,
  });
  
  return NextResponse.json(await response.json());
}

// Note: This is a simplified implementation. For production, you may want to use
// a separate Express server or custom route handler for Bull Board.