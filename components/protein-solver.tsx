"use client";

import React, { useState } from "react";
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
import { OrbitControls } from "@react-three/drei";
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
import { Direction } from "@/lib/types";
import {
  MonteCarloSolver,
  SimulatedAnnealingSolver,
  type SolverResult,
  type Conformation,
} from "@/lib/solvers";

interface ProteinSolverProps {
  sequence: string;
  initialDirections?: Direction[];
  onOptimizationComplete: (directions: Direction[], energy: number) => void;
}

type AlgorithmType = "monte-carlo" | "simulated-annealing";

const ProteinSolver: React.FC<ProteinSolverProps> = ({
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
  const [progress, setProgress] = useState(0);
  const [currentResult, setCurrentResult] = useState<SolverResult | null>(null);
  const [bestConformation, setBestConformation] = useState<Conformation | null>(
    null
  );

  const runSolver = async () => {
    if (!sequence) return;

    setIsRunning(true);
    setProgress(0);
    setCurrentResult(null);
    setBestConformation(null);

    try {
      let solver;

      if (algorithmType === "monte-carlo") {
        solver = new MonteCarloSolver({
          sequence,
          maxIterations: iterations[0],
          populationSize: populationSize[0],
          initialDirections,
        });
      } else {
        solver = new SimulatedAnnealingSolver({
          sequence,
          maxIterations: iterations[0],
          initialTemperature: temperature[0],
          finalTemperature: 0.1,
          coolingRate: 0.95,
          initialDirections,
        });
      }

      // Run solver with progress updates
      const result = await solver.solve();

      setCurrentResult(result);
      setBestConformation(result.bestConformation);
      setProgress(100);

      // Notify parent component
      onOptimizationComplete(
        result.bestConformation.directions,
        result.bestConformation.energy
      );
    } catch (error) {
      console.error("Solver error:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const resetSolver = () => {
    setCurrentResult(null);
    setBestConformation(null);
    setProgress(0);
  };

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
    <div className="space-y-6">
      {/* Algorithm Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Solver Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Algorithm</Label>
            <Select
              value={algorithmType}
              onValueChange={(value: AlgorithmType) => setAlgorithmType(value)}
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
            <Label>Iterations: {iterations[0]}</Label>
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
              <Label>Population Size: {populationSize[0]}</Label>
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
              <Label>Initial Temperature: {temperature[0]}</Label>
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
            <Button onClick={runSolver} disabled={isRunning} className="flex-1">
              {isRunning ? "Running..." : "Run Solver"}
            </Button>
            <Button
              onClick={resetSolver}
              variant="outline"
              disabled={isRunning}
            >
              Reset
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <Label>Progress</Label>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {currentResult && (
        <>
          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {currentResult.bestConformation.energy}
                  </div>
                  <div className="text-sm text-gray-600">Best Energy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {currentResult.totalIterations}
                  </div>
                  <div className="text-sm text-gray-600">Iterations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {currentResult.convergenceTime}ms
                  </div>
                  <div className="text-sm text-gray-600">Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {currentResult.bestConformation.directions.join("")}
                  </div>
                  <div className="text-sm text-gray-600">Best Directions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Energy Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Energy Evolution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
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

          {/* 3D Visualization */}
          {bestConformation && (
            <Card>
              <CardHeader>
                <CardTitle>Best Conformation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-50 rounded-md overflow-hidden">
                  <Canvas>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 10]} intensity={1} />
                    <OrbitControls enablePan enableZoom enableRotate />
                    <ProteinModel
                      sequence={bestConformation.sequence}
                      directions={bestConformation.directions}
                      type="3d"
                    />
                  </Canvas>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ProteinSolver;
