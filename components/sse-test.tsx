"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import JobMonitor from "./job-monitor";
import { useJobStream } from "@/hooks/useJobStream";

const SSETest: React.FC = () => {
  const [testJob, setTestJob] = useState({
    algorithm: "monte-carlo",
    sequence: "HPPH",
    maxIterations: 10,
    populationSize: 5,
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastJobId, setLastJobId] = useState<string | null>(null);

  const { isConnected, jobUpdates } = useJobStream({
    onJobUpdate: (update) => {
      console.log("Job update received:", update);
      if (update.status === "completed") {
        console.log("Job completed with result:", update.result);
      }
    },
  });

  const submitTestJob = async () => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          algorithm: testJob.algorithm,
          sequence: testJob.sequence,
          parameters: {
            maxIterations: testJob.maxIterations,
            populationSize: testJob.populationSize,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        setLastJobId(result.jobId);
        console.log("Job submitted successfully:", result.jobId);
      } else {
        console.error("Job submission failed:", result.error);
      }
    } catch (error) {
      console.error("Failed to submit job:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const jobUpdatesArray = Array.from(jobUpdates.values());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SSE Job Stream Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="algorithm">Algorithm</Label>
              <Select
                value={testJob.algorithm}
                onValueChange={(value) =>
                  setTestJob((prev) => ({ ...prev, algorithm: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monte-carlo">Monte Carlo</SelectItem>
                  <SelectItem value="simulated-annealing">
                    Simulated Annealing
                  </SelectItem>
                  <SelectItem value="genetic-algorithm">
                    Genetic Algorithm
                  </SelectItem>
                  <SelectItem value="rosetta">Rosetta (Test)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sequence">Sequence</Label>
              <Input
                id="sequence"
                value={testJob.sequence}
                onChange={(e) =>
                  setTestJob((prev) => ({ ...prev, sequence: e.target.value }))
                }
                placeholder="HPPH"
              />
            </div>

            <div>
              <Label htmlFor="iterations">Max Iterations</Label>
              <Input
                id="iterations"
                type="number"
                value={testJob.maxIterations}
                onChange={(e) =>
                  setTestJob((prev) => ({
                    ...prev,
                    maxIterations: parseInt(e.target.value) || 10,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="population">Population Size</Label>
              <Input
                id="population"
                type="number"
                value={testJob.populationSize}
                onChange={(e) =>
                  setTestJob((prev) => ({
                    ...prev,
                    populationSize: parseInt(e.target.value) || 5,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={submitTestJob}
              disabled={submitting || !isConnected}
              className="flex-1"
            >
              {submitting ? "Submitting..." : "Submit Test Job"}
            </Button>

            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm text-gray-600">
                {isConnected ? "SSE Connected" : "SSE Disconnected"}
              </span>
            </div>
          </div>

          {lastJobId && (
            <Alert>
              <AlertDescription>
                Last submitted job ID:{" "}
                <code className="bg-gray-100 px-1 rounded">{lastJobId}</code>
              </AlertDescription>
            </Alert>
          )}

          {jobUpdatesArray.length > 0 && (
            <Alert>
              <AlertDescription>
                Active jobs: {jobUpdatesArray.length} | Running:{" "}
                {jobUpdatesArray.filter((j) => j.status === "running").length} |
                Completed:{" "}
                {jobUpdatesArray.filter((j) => j.status === "completed").length}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Job Monitor Component */}
      <JobMonitor
        showConnectionStatus={false}
        onJobUpdate={(update) => {
          console.log("Job monitor received update:", update);
        }}
      />
    </div>
  );
};

export default SSETest;
