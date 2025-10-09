import { Direction } from "../types";

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Conformation {
  sequence: string;
  directions: Direction[];
  energy: number;
  positions: Position[];
}

export interface SolverResult {
  bestConformation: Conformation;
  energyHistory: { iteration: number; energy: number }[];
  totalIterations: number;
  convergenceTime: number;
}

export interface SolverParameters {
  maxIterations: number;
  sequence: string;
  initialDirections?: Direction[];
  onProgress?: (progress: any) => void;
}

export interface MonteCarloParameters extends SolverParameters {
  populationSize: number;
}

export interface SimulatedAnnealingParameters extends SolverParameters {
  initialTemperature: number;
  finalTemperature: number;
  coolingRate: number;
}

export abstract class BaseSolver {
  protected sequence: string;
  protected maxIterations: number;
  protected isStopped: boolean = false;
  protected onProgress?: (progress: any) => void;

  constructor(parameters: SolverParameters) {
    this.sequence = parameters.sequence;
    this.maxIterations = parameters.maxIterations;
    this.onProgress = parameters.onProgress;
  }

  abstract solve(): Promise<SolverResult>;

  stop(): void {
    this.isStopped = true;
  }

  protected generateRandomDirections(): Direction[] {
    const directions: Direction[] = [];
    const possibleDirections: Direction[] = ["L", "R", "U", "D"];
    
    for (let i = 0; i < this.sequence.length - 1; i++) {
      const randomIndex = Math.floor(Math.random() * possibleDirections.length);
      directions.push(possibleDirections[randomIndex]);
    }
    
    return directions;
  }
}
