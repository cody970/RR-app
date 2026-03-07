'use client';

import { useEffect, useState } from 'react';

export default function QueueMonitoringPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueues();
    const interval = setInterval(fetchQueues, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchQueues = async () => {
    try {
      const response = await fetch('/api/queues');
      const data = await response.json();
      setQueues(data);
    } catch (error) {
      console.error('Failed to fetch queues:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQueueStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'waiting': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Queue Monitoring</h1>
        <p className="text-gray-600 mt-2">Monitor your background job queues</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {queues.map((queue: any) => (
            <div key={queue.name} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${getQueueStatusColor(queue.status)}`}></div>
                  <h2 className="text-xl font-semibold">{queue.name}</h2>
                </div>
                <span className="text-sm text-gray-500">
                  Status: {queue.status}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{queue.waiting}</div>
                  <div className="text-sm text-gray-600">Waiting</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{queue.active}</div>
                  <div className="text-sm text-gray-600">Active</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-600">{queue.delayed}</div>
                  <div className="text-sm text-gray-600">Delayed</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600">{queue.failed}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Pro Tip</h3>
        <p className="text-blue-800 text-sm">
          For full queue management capabilities, use the Bull Board UI. 
          You can access it at{' '}
          <a href="/api/queues" className="underline font-medium">
            /api/queues
          </a>
          {' '}when running the standalone Bull Board server.
        </p>
      </div>
    </div>
  );
}