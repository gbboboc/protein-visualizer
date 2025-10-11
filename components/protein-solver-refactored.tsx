"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import ProteinModel from "./protein-model";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Direction } from "@/lib/types";
import {
  ProteinSolverService,
  type SolverConfig,
  type SolverProgress,
} from "@/lib/services/protein-solver-service";
import type { SolverResult, Conformation } from "@/lib/solvers";

interface ProteinSolverRefactoredProps {
  sequence: string;
  initialDirections?: Direction[];
  onOptimizationComplete: (directions: Direction[], energy: number) => void;
}

type AlgorithmType = "monte-carlo" | "simulated-annealing";

const ProteinSolverRefactored: React.FC<ProteinSolverRefactoredProps> = ({
  sequence,
  initialDirections,
  onOptimizationComplete,
}) => {
  // Algorithm selection and parameters
  const [algorithmType, setAlgorithmType] =
    useState<AlgorithmType>("monte-carlo");
  const [iterations, setIterations] = useState([1000]);
  const [populationSize, setPopulationSize] = useState([50]); // For Monte Carlo
  const [temperature, setTemperature] = useState([10]); // For Simulated Annealing

  // Solver state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<SolverProgress | null>(null);
  const [currentResult, setCurrentResult] = useState<SolverResult | null>(null);
  const [bestConformation, setBestConformation] = useState<Conformation | null>(
    null
  );

  // UI state
  const [showDetails, setShowDetails] = useState(false);

  // Solver service instance
  const [solverService] = useState(() => new ProteinSolverService());

  const runSolver = useCallback(async () => {
    if (!sequence) return;

    setIsRunning(true);
    setProgress(null);
    setCurrentResult(null);
    setBestConformation(null);

    try {
      const config: SolverConfig = {
        algorithm: algorithmType,
        sequence,
        initialDirections,
        maxIterations: iterations[0],
        populationSize:
          algorithmType === "monte-carlo" ? populationSize[0] : undefined,
        initialTemperature:
          algorithmType === "simulated-annealing" ? temperature[0] : undefined,
        finalTemperature:
          algorithmType === "simulated-annealing" ? 0.01 : undefined,
        coolingRate: algorithmType === "simulated-annealing" ? 0.95 : undefined,
      };

      const result = await solverService.solve(config, {
        onProgress: (progressData) => {
          setProgress(progressData);
        },
        onComplete: (result) => {
          setCurrentResult(result);
          setBestConformation(result.bestConformation);
          setProgress({ ...progress!, progress: 100 });
          onOptimizationComplete(
            result.bestConformation.directions,
            result.bestConformation.energy
          );
        },
        onError: (error) => {
          console.error("Solver error:", error);
        },
      });
    } catch (error) {
      console.error("Solver execution failed:", error);
    } finally {
      setIsRunning(false);
    }
  }, [
    sequence,
    algorithmType,
    iterations,
    populationSize,
    temperature,
    initialDirections,
    solverService,
    onOptimizationComplete,
  ]);

  const stopSolver = useCallback(() => {
    solverService.stop();
    setIsRunning(false);
  }, [solverService]);

  if (!sequence) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <p className="text-gray-600 text-center">
              Please provide a protein sequence to use the solver. The sequence
              should consist of H (hydrophobic) and P (polar) residues.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Configuration + Energy */}
        <div className="space-y-4">
          {/* Compact Algorithm Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Solver Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Algorithm</Label>
                <Select
                  value={algorithmType}
                  onValueChange={(value: AlgorithmType) =>
                    setAlgorithmType(value)
                  }
                  disabled={isRunning}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monte-carlo">
                      Monte Carlo Sampling
                    </SelectItem>
                    <SelectItem value="simulated-annealing">
                      Simulated Annealing
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Iterations: {iterations[0]}</Label>
                <Slider
                  value={iterations}
                  onValueChange={setIterations}
                  min={100}
                  max={10000}
                  step={100}
                  disabled={isRunning}
                />
              </div>

              {algorithmType === "monte-carlo" && (
                <div className="space-y-2">
                  <Label className="text-sm">
                    Population Size: {populationSize[0]}
                  </Label>
                  <Slider
                    value={populationSize}
                    onValueChange={setPopulationSize}
                    min={10}
                    max={200}
                    step={10}
                    disabled={isRunning}
                  />
                </div>
              )}

              {algorithmType === "simulated-annealing" && (
                <div className="space-y-2">
                  <Label className="text-sm">
                    Initial Temperature: {temperature[0]}
                  </Label>
                  <Slider
                    value={temperature}
                    onValueChange={setTemperature}
                    min={1}
                    max={50}
                    step={1}
                    disabled={isRunning}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={runSolver}
                  disabled={isRunning}
                  className="flex-1"
                >
                  {isRunning ? "Running..." : "Start Optimization"}
                </Button>
                {isRunning && (
                  <Button
                    onClick={stopSolver}
                    variant="outline"
                    className="flex-1"
                  >
                    Stop
                  </Button>
                )}
              </div>

              {isRunning && progress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress.progress)}%</span>
                  </div>
                  <Progress value={progress.progress} />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Iteration: {progress.iteration}</span>
                    <span>Energy: {progress.bestEnergy}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Energy Windows - Smaller */}
          {currentResult && (
            <div className="grid grid-cols-2 gap-2">
              <Card>
                <CardContent className="pt-3 pb-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {progress?.currentEnergy ||
                        currentResult.bestConformation.energy}
                    </div>
                    <div className="text-xs text-gray-600">Current Energy</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-3 pb-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {progress?.bestEnergy ||
                        currentResult.bestConformation.energy}
                    </div>
                    <div className="text-xs text-gray-600">Best Energy</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column: Visualization + Energy Evolution */}
        {currentResult && bestConformation && (
          <div className="space-y-4">
            {/* Primary Visualization */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 bg-gray-50 rounded-md overflow-hidden">
                  <Canvas>
                    <OrthographicCamera
                      makeDefault
                      position={[0, 0, 10]}
                      near={0.1}
                      far={1000}
                      zoom={40}
                    />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 10]} intensity={1} />
                    <OrbitControls
                      enableRotate
                      enablePan
                      enableZoom
                      screenSpacePanning
                      target={[0, 0, 0]}
                    />
                    <ProteinModel
                      sequence={bestConformation.sequence}
                      directions={bestConformation.directions}
                      type="3d"
                    />
                  </Canvas>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Energy Evolution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Energy Evolution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentResult.energyHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="iteration" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="energy"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Show Details Section */}
      {currentResult && (
        <div className="space-y-4">
          {/* Expandable Details Button */}
          <Button
            variant="outline"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Show Details
              </>
            )}
          </Button>

          {/* Detailed Results - Expandable */}
          {showDetails && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">
                      {currentResult.bestConformation.energy}
                    </div>
                    <div className="text-sm text-gray-600">Best Energy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">
                      {currentResult.totalIterations}
                    </div>
                    <div className="text-sm text-gray-600">Iterations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">
                      {currentResult.convergenceTime}ms
                    </div>
                    <div className="text-sm text-gray-600">Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold font-mono">
                      {currentResult.bestConformation.directions.join("")}
                    </div>
                    <div className="text-sm text-gray-600">Best Directions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default ProteinSolverRefactored;
