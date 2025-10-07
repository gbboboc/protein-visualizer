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
  energyHistory: { 
    iteration: number; 
    energy: number;
    bestEnergy?: number;
    temperature?: number;
  }[];
  totalIterations: number;
  convergenceTime: number;
}

export interface SolverParameters {
  maxIterations: number;
  sequence: string;
  initialDirections?: Direction[];
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

  constructor(parameters: SolverParameters) {
    this.sequence = parameters.sequence;
    this.maxIterations = parameters.maxIterations;
  }

  abstract solve(): Promise<SolverResult>;

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
