"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useJobStream, type JobUpdate } from "@/hooks/useJobStream";
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
} from "lucide-react";

interface JobMonitorProps {
  onJobUpdate?: (update: JobUpdate) => void;
  showConnectionStatus?: boolean;
  autoRefresh?: boolean;
}

const JobMonitor: React.FC<JobMonitorProps> = ({
  onJobUpdate,
  showConnectionStatus = true,
  autoRefresh = true,
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const {
    isConnected,
    isConnecting,
    jobUpdates,
    connect,
    disconnect,
    clearUpdates,
  } = useJobStream({
    autoConnect: autoRefresh,
    onJobUpdate: (update) => {
      onJobUpdate?.(update);

      // Auto-select the first running job
      if (update.status === "running" && !selectedJobId) {
        setSelectedJobId(update.jobId);
      }
    },
  });

  const jobUpdatesArray = Array.from(jobUpdates.values());
  const selectedJob = selectedJobId ? jobUpdates.get(selectedJobId) : null;

  const getStatusIcon = (status: JobUpdate["status"]) => {
    switch (status) {
      case "queued":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "running":
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: JobUpdate["status"]) => {
    switch (status) {
      case "queued":
        return "bg-yellow-100 text-yellow-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.round((end.getTime() - start.getTime()) / 1000);

    if (duration < 60) {
      return `${duration}s`;
    } else if (duration < 3600) {
      return `${Math.round(duration / 60)}m ${duration % 60}s`;
    } else {
      const hours = Math.floor(duration / 3600);
      const minutes = Math.round((duration % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      {showConnectionStatus && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Job Monitor</CardTitle>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected
                      ? "bg-green-500"
                      : isConnecting
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="text-sm text-gray-600">
                  {isConnected
                    ? "Connected"
                    : isConnecting
                    ? "Connecting..."
                    : "Disconnected"}
                </span>
                {isConnected ? (
                  <Button size="sm" variant="outline" onClick={disconnect}>
                    <Pause className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={connect}
                    disabled={isConnecting}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Job List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Active Jobs</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={clearUpdates}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {jobUpdatesArray.length === 0 ? (
            <Alert>
              <AlertDescription>
                No active jobs. Submit a job to see real-time progress updates.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {jobUpdatesArray.map((job) => (
                <div
                  key={job.jobId}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedJobId === job.jobId
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedJobId(job.jobId)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className="font-medium text-sm">
                        {job.jobId.slice(-8)}
                      </span>
                    </div>
                    <Badge className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Progress: {job.progress}%</span>
                      {job.startedAt && (
                        <span>
                          Duration:{" "}
                          {formatDuration(job.startedAt, job.completedAt)}
                        </span>
                      )}
                    </div>

                    {job.status === "running" && (
                      <Progress value={job.progress} className="h-2" />
                    )}

                    {job.error && (
                      <Alert className="mt-2">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          {job.error}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Job Details */}
      {selectedJob && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Job ID:</span>
                <p className="text-gray-600">{selectedJob.jobId}</p>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedJob.status)}
                  <Badge className={getStatusColor(selectedJob.status)}>
                    {selectedJob.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="font-medium">Progress:</span>
                <p className="text-gray-600">{selectedJob.progress}%</p>
              </div>
              <div>
                <span className="font-medium">Created:</span>
                <p className="text-gray-600">
                  {new Date(selectedJob.createdAt).toLocaleString()}
                </p>
              </div>
              {selectedJob.startedAt && (
                <div>
                  <span className="font-medium">Started:</span>
                  <p className="text-gray-600">
                    {new Date(selectedJob.startedAt).toLocaleString()}
                  </p>
                </div>
              )}
              {selectedJob.completedAt && (
                <div>
                  <span className="font-medium">Completed:</span>
                  <p className="text-gray-600">
                    {new Date(selectedJob.completedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {selectedJob.status === "running" && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span>{selectedJob.progress}%</span>
                </div>
                <Progress value={selectedJob.progress} className="h-2" />
              </div>
            )}

            {selectedJob.result && (
              <div>
                <span className="font-medium text-sm">Result:</span>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(selectedJob.result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobMonitor;
