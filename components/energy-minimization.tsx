"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
import { Direction } from "@/lib/types";
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
import { directionToPosition } from "@/lib/utils";

interface Position {
  x: number;
  y: number;
  z: number;
}

interface EnergyMinimizationProps {
  sequence: string;
  initialDirections?: Direction[];
  onOptimizationComplete?: (directions: Direction[], energy: number) => void;
}

const EnergyMinimization: React.FC<EnergyMinimizationProps> = ({
  sequence,
  initialDirections,
  onOptimizationComplete,
}) => {
  const [algorithm, setAlgorithm] = useState<string>("monte-carlo");
  const [temperature, setTemperature] = useState<number>(1.0);
  const [iterations, setIterations] = useState<number>(1000);
  const [currentIteration, setCurrentIteration] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [directions, setDirections] = useState<Direction[]>(
    initialDirections || []
  );
  const [energy, setEnergy] = useState<number>(0);
  const [energyHistory, setEnergyHistory] = useState<
    { iteration: number; energy: number }[]
  >([]);
  const [bestDirections, setBestDirections] = useState<Direction[]>([]);
  const [bestEnergy, setBestEnergy] = useState<number>(0);

  // Generate valid non-intersecting directions
  const generateValidDirections = (seq: string): Direction[] => {
    if (seq.length <= 1) return [];
    
    const directions: Direction[] = [];
    const occupied = new Set<string>();
    let currentPos = { x: 0, y: 0, z: 0 };
    
    // Always start with the first position
    occupied.add(`${currentPos.x},${currentPos.y},${currentPos.z}`);
    
    // Generate directions that don't cause self-intersection
    const possibleDirections: Direction[] = ["R", "U", "L", "D"];
    
    for (let i = 1; i < seq.length; i++) {
      // Try directions in order of preference
      let directionFound = false;
      
      for (const dir of possibleDirections) {
        const nextPos = getNextPosition(currentPos, dir);
        const posKey = `${nextPos.x},${nextPos.y},${nextPos.z}`;
        
        if (!occupied.has(posKey)) {
          directions.push(dir);
          occupied.add(posKey);
          currentPos = nextPos;
          directionFound = true;
          break;
        }
      }
      
      // If no valid direction found, use a random one (fallback)
      if (!directionFound) {
        const randomDir = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
        directions.push(randomDir);
        const nextPos = getNextPosition(currentPos, randomDir);
        currentPos = nextPos;
        // Don't add to occupied set to allow some flexibility
      }
    }
    
    return directions;
  };

  const getNextPosition = (pos: Position, dir: Direction): Position => {
    switch (dir) {
      case 'L': return { x: pos.x - 1, y: pos.y, z: pos.z };
      case 'R': return { x: pos.x + 1, y: pos.y, z: pos.z };
      case 'U': return { x: pos.x, y: pos.y + 1, z: pos.z };
      case 'D': return { x: pos.x, y: pos.y - 1, z: pos.z };
      default: return pos;
    }
  };

  // Initialize directions if not provided
  useEffect(() => {
    if (!initialDirections || initialDirections.length === 0) {
      // Generate non-intersecting default directions
      const defaultDirections = generateValidDirections(sequence);
      setDirections(defaultDirections);
    }
  }, [sequence, initialDirections]);

  // Calculate energy for a given configuration
  const calculateEnergy = (seq: string, dirs: string[]): number => {
    // Create a 2D grid to track positions
    const positions: Position[] = [];
    const occupied: Record<string, boolean> = {};

    // Start with the first amino acid at the origin
    positions.push({ x: 0, y: 0, z: 0 });
    occupied["0,0,0"] = true;

    // Place each subsequent amino acid based on the directions
    for (let i = 1; i < seq.length; i++) {
      const prevPos = positions[i - 1];
      const direction = dirs[i - 1];

      // Use direction directly (expecting letter format only)
      const dir = direction as Direction;

      const positionChange = directionToPosition(dir);
      const newPos: Position = {
        x: prevPos.x + positionChange.x,
        y: prevPos.y + positionChange.y,
        z: prevPos.z + positionChange.z,
      };

      // Check for self-intersection (invalid configuration)
      const posKey = `${newPos.x},${newPos.y},${newPos.z}`;
      if (occupied[posKey]) {
        return Number.POSITIVE_INFINITY; // Invalid configuration
      }

      positions.push(newPos);
      occupied[posKey] = true;
    }

    // Calculate energy based on H-H contacts (not directly connected)
    let energy = 0;
    for (let i = 0; i < seq.length; i++) {
      if (seq[i] === "H") {
        // Only check positions after i to avoid double counting
        for (let j = i + 2; j < seq.length; j++) {
          if (seq[j] === "H") {
            // Check if positions are adjacent but not directly connected
            const dx = Math.abs(positions[i].x - positions[j].x);
            const dy = Math.abs(positions[i].y - positions[j].y);
            const dz = Math.abs(positions[i].z - positions[j].z);

            if (dx + dy + dz === 1) {
              energy -= 1; // Each H-H contact contributes -1 to energy
            }
          }
        }
      }
    }

    return energy;
  };

  // Run Monte Carlo simulation
  const runMonteCarloSimulation = async () => {
    setIsRunning(true);
    setCurrentIteration(0);
    setEnergyHistory([]);

    let currentDirections = [...directions];
    let currentEnergy = calculateEnergy(sequence, currentDirections);

    let bestDirs = [...currentDirections];
    let bestE = currentEnergy;

    setEnergy(currentEnergy);
    setEnergyHistory([{ iteration: 0, energy: currentEnergy }]);

    for (let i = 1; i <= iterations; i++) {
      // Make a random move
      const newDirections = [...currentDirections];
      const randomIndex = Math.floor(Math.random() * newDirections.length);
      const possibleDirections = ["L", "R", "U", "D"];
      newDirections[randomIndex] = possibleDirections[
        Math.floor(Math.random() * possibleDirections.length)
      ] as Direction;

      // Calculate new energy
      const newEnergy = calculateEnergy(sequence, newDirections);

      // Accept or reject the move based on Metropolis criterion
      let accepted = false;
      if (newEnergy < currentEnergy) {
        accepted = true;
      } else {
        const acceptanceProbability = Math.exp(
          (currentEnergy - newEnergy) / temperature
        );
        if (Math.random() < acceptanceProbability) {
          accepted = true;
        }
      }

      if (accepted && newEnergy !== Number.POSITIVE_INFINITY) {
        currentDirections = newDirections;
        currentEnergy = newEnergy;

        if (currentEnergy < bestE) {
          bestDirs = [...currentDirections];
          bestE = currentEnergy;
          setBestDirections(bestDirs);
          setBestEnergy(bestE);
        }
      }

      setDirections(currentDirections);
      setEnergy(currentEnergy);
      setCurrentIteration(i);
      setEnergyHistory((prev) => [
        ...prev,
        { iteration: i, energy: currentEnergy },
      ]);

      // Slow down the simulation to see the progress
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    setIsRunning(false);

    if (onOptimizationComplete) {
      onOptimizationComplete(bestDirs, bestE);
    }
  };

  // Run simulated annealing
  const runSimulatedAnnealing = async () => {
    setIsRunning(true);
    setCurrentIteration(0);
    setEnergyHistory([]);

    let currentDirections = [...directions];
    let currentEnergy = calculateEnergy(sequence, currentDirections);

    let bestDirs = [...currentDirections];
    let bestE = currentEnergy;

    setEnergy(currentEnergy);
    setEnergyHistory([{ iteration: 0, energy: currentEnergy }]);

    let currentTemp = temperature;
    const coolingRate = temperature / iterations;

    for (let i = 1; i <= iterations; i++) {
      // Make a random move
      const newDirections = [...currentDirections];
      const randomIndex = Math.floor(Math.random() * newDirections.length);
      const possibleDirections = ["L", "R", "U", "D"];
      newDirections[randomIndex] = possibleDirections[
        Math.floor(Math.random() * possibleDirections.length)
      ] as Direction;

      // Calculate new energy
      const newEnergy = calculateEnergy(sequence, newDirections);

      // Accept or reject the move based on Metropolis criterion
      let accepted = false;
      if (newEnergy < currentEnergy) {
        accepted = true;
      } else {
        const acceptanceProbability = Math.exp(
          (currentEnergy - newEnergy) / currentTemp
        );
        if (Math.random() < acceptanceProbability) {
          accepted = true;
        }
      }

      if (accepted && newEnergy !== Number.POSITIVE_INFINITY) {
        currentDirections = newDirections;
        currentEnergy = newEnergy;

        if (currentEnergy < bestE) {
          bestDirs = [...currentDirections];
          bestE = currentEnergy;
          setBestDirections(bestDirs);
          setBestEnergy(bestE);
        }
      }

      // Cool down the temperature
      currentTemp = Math.max(0.01, currentTemp - coolingRate);

      setDirections(currentDirections);
      setEnergy(currentEnergy);
      setCurrentIteration(i);
      setEnergyHistory((prev) => [
        ...prev,
        { iteration: i, energy: currentEnergy },
      ]);

      // Slow down the simulation to see the progress
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    setIsRunning(false);

    if (onOptimizationComplete) {
      onOptimizationComplete(bestDirs, bestE);
    }
  };

  const handleStartOptimization = () => {
    if (algorithm === "monte-carlo") {
      runMonteCarloSimulation();
    } else if (algorithm === "simulated-annealing") {
      runSimulatedAnnealing();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Energy Minimization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="algorithm">Algorithm</Label>
            <Select
              value={algorithm}
              onValueChange={setAlgorithm}
              disabled={isRunning}
            >
              <SelectTrigger id="algorithm">
                <SelectValue placeholder="Select algorithm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monte-carlo">Monte Carlo</SelectItem>
                <SelectItem value="simulated-annealing">
                  Simulated Annealing
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="temperature">
              Temperature: {temperature.toFixed(2)}
            </Label>
            <Slider
              id="temperature"
              min={0.1}
              max={5}
              step={0.1}
              value={[temperature]}
              onValueChange={([value]) => setTemperature(value)}
              disabled={isRunning}
            />
          </div>

          <div>
            <Label htmlFor="iterations">Iterations: {iterations}</Label>
            <Slider
              id="iterations"
              min={100}
              max={5000}
              step={100}
              value={[iterations]}
              onValueChange={([value]) => setIterations(value)}
              disabled={isRunning}
            />
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>
                  {Math.round((currentIteration / iterations) * 100)}%
                </span>
              </div>
              <Progress value={(currentIteration / iterations) * 100} />
            </div>
          )}

          <div className="pt-2">
            <Button
              onClick={handleStartOptimization}
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? "Optimizing..." : "Start Optimization"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-gray-50 p-3 rounded-md">
              <h3 className="text-sm font-medium text-gray-700">
                Current Energy
              </h3>
              <p className="text-2xl font-bold text-indigo-700">{energy}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <h3 className="text-sm font-medium text-gray-700">Best Energy</h3>
              <p className="text-2xl font-bold text-indigo-700">{bestEnergy}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-50 rounded-md overflow-hidden">
            <Canvas>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 10]} intensity={1} />
              <OrbitControls enablePan enableZoom enableRotate />
              <ProteinModel
                sequence={sequence}
                directions={directions as any}
                type="3d"
              />
            </Canvas>
          </div>

          {energyHistory.length > 0 && (
            <div className="mt-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={energyHistory}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="iteration" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="energy" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnergyMinimization;
