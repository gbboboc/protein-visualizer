import { Direction } from "../types";
import { BaseSolver, SimulatedAnnealingParameters, SolverResult, Conformation, Position } from "./types";
import { EnergyCalculator } from "./energy-calculator";

export class SimulatedAnnealingSolver extends BaseSolver {
  private initialTemperature: number;
  private finalTemperature: number;
  private coolingRate: number;

  constructor(parameters: SimulatedAnnealingParameters) {
    super(parameters);
    this.initialTemperature = parameters.initialTemperature;
    this.finalTemperature = parameters.finalTemperature;
    this.coolingRate = parameters.coolingRate;
  }

  async solve(): Promise<SolverResult> {
    const startTime = Date.now();
    const energyHistory: { iteration: number; energy: number }[] = [];
    
    // Initialize temperature first
    let temperature = this.initialTemperature;
    
    // Initialize with random or provided conformation
    let currentConformation = this.initializeConformation();
    let bestConformation = { ...currentConformation };
    
    energyHistory.push({ 
      iteration: 0, 
      energy: currentConformation.energy,
      bestEnergy: currentConformation.energy,
      temperature: temperature
    });

    // Simulated Annealing optimization
    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      // Generate neighbor conformation
      const neighborConformation = this.generateNeighbor(currentConformation);
      
      // Accept or reject the move
      if (this.acceptMove(currentConformation.energy, neighborConformation.energy, temperature)) {
        currentConformation = neighborConformation;
        
        // Update global best
        if (currentConformation.energy < bestConformation.energy) {
          bestConformation = { ...currentConformation };
        }
      }
      
      // Cool down temperature
      temperature = this.updateTemperature(temperature, iteration);
      
      // Record energy history (sample every 10 iterations)
      // Track both current and best energy to show funnel exploration
      if (iteration % 10 === 0) {
        energyHistory.push({ 
          iteration, 
          energy: currentConformation.energy,
          bestEnergy: bestConformation.energy,
          temperature: temperature
        });
      }

      // Allow UI updates
      if (iteration % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      // Early termination if temperature is too low
      if (temperature < this.finalTemperature) {
        break;
      }
    }

    const convergenceTime = Date.now() - startTime;

    return {
      bestConformation,
      energyHistory,
      totalIterations: this.maxIterations,
      convergenceTime
    };
  }

  private initializeConformation(): Conformation {
    const directions = this.generateRandomDirections();
    return EnergyCalculator.createConformation(this.sequence, directions);
  }

  private generateNeighbor(conformation: Conformation): Conformation {
    // Create a neighbor by randomly changing one direction
    const newDirections = [...conformation.directions];
    const randomIndex = Math.floor(Math.random() * newDirections.length);
    const possibleDirections: Direction[] = ["L", "R", "U", "D"];
    
    // Choose a different direction
    const currentDirection = newDirections[randomIndex];
    const availableDirections = possibleDirections.filter(d => d !== currentDirection);
    const newDirection = availableDirections[Math.floor(Math.random() * availableDirections.length)];
    
    newDirections[randomIndex] = newDirection;
    
    return EnergyCalculator.createConformation(this.sequence, newDirections);
  }

  private acceptMove(currentEnergy: number, newEnergy: number, temperature: number): boolean {
    // Always accept better solutions
    if (newEnergy < currentEnergy) {
      return true;
    }
    
    // Accept worse solutions with probability based on temperature
    if (temperature > 0) {
      const acceptanceProbability = Math.exp((currentEnergy - newEnergy) / temperature);
      return Math.random() < acceptanceProbability;
    }
    
    return false;
  }

  private updateTemperature(currentTemperature: number, iteration: number): number {
    // Exponential cooling schedule for better landscape exploration
    // This creates a more gradual cooling that allows proper funnel navigation
    const coolingFactor = Math.pow(this.finalTemperature / this.initialTemperature, 1 / this.maxIterations);
    return this.initialTemperature * Math.pow(coolingFactor, iteration);
  }

  /**
   * Get current temperature for monitoring
   */
  getCurrentTemperature(iteration: number): number {
    return this.updateTemperature(this.initialTemperature, iteration);
  }
}
