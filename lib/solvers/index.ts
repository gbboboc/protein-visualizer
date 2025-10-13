// Export all solver classes and types
export { BaseSolver } from "./types";
export type { 
  Position, 
  Conformation, 
  SolverResult, 
  SolverParameters,
  MonteCarloParameters,
  SimulatedAnnealingParameters,
  GeneticAlgorithmParameters 
} from "./types";

export { EnergyCalculator } from "./energy-calculator";
export { MonteCarloSolver } from "./monte-carlo";
export { SimulatedAnnealingSolver } from "./simulated-annealing";
export { GeneticAlgorithmSolver } from "./genetic-algorithm";

// Convenience factory functions
import type { MonteCarloParameters, SimulatedAnnealingParameters, GeneticAlgorithmParameters } from "./types";

export function createMonteCarloSolver(parameters: MonteCarloParameters) {
  const { MonteCarloSolver } = require("./monte-carlo");
  return new MonteCarloSolver(parameters);
}

export function createSimulatedAnnealingSolver(parameters: SimulatedAnnealingParameters) {
  const { SimulatedAnnealingSolver } = require("./simulated-annealing");
  return new SimulatedAnnealingSolver(parameters);
}

export function createGeneticAlgorithmSolver(parameters: GeneticAlgorithmParameters) {
  const { GeneticAlgorithmSolver } = require("./genetic-algorithm");
  return new GeneticAlgorithmSolver(parameters);
}
