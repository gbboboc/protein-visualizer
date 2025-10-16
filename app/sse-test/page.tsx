"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SSETest from "@/components/sse-test";

export default function SSETestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Server-Sent Events (SSE) Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                This page tests the Server-Sent Events implementation for
                real-time job progress updates.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">
                  How it works:
                </h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Submit a job using the form below</li>
                  <li>• Watch real-time progress updates via SSE</li>
                  <li>• Monitor job status changes automatically</li>
                  <li>• View detailed job information and results</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">
                  SSE Benefits:
                </h3>
                <ul className="text-green-800 text-sm space-y-1">
                  <li>✅ Simpler than WebSockets</li>
                  <li>✅ Automatic reconnection</li>
                  <li>✅ HTTP-based (works through proxies)</li>
                  <li>✅ Perfect for one-way communication</li>
                  <li>✅ Built-in browser support</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <SSETest />
      </div>
    </div>
  );
}
