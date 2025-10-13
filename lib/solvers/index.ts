// Export all solver classes and types
export { BaseSolver } from "./types";
export type { 
  Position, 
  Conformation, 
  SolverResult, 
  SolverParameters,
  MonteCarloParameters,
  SimulatedAnnealingParameters,
  GeneticAlgorithmParameters,
  EvolutionStrategiesParameters,
  EvolutionaryProgrammingParameters 
} from "./types";

export { EnergyCalculator } from "./energy-calculator";
export { MonteCarloSolver } from "./monte-carlo";
export { SimulatedAnnealingSolver } from "./simulated-annealing";
export { GeneticAlgorithmSolver } from "./genetic-algorithm";
export { EvolutionStrategiesSolver } from "./evolution-strategies";
export { EvolutionaryProgrammingSolver } from "./evolutionary-programming";

// Convenience factory functions
import type { MonteCarloParameters, SimulatedAnnealingParameters, GeneticAlgorithmParameters, EvolutionStrategiesParameters, EvolutionaryProgrammingParameters } from "./types";

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

export function createEvolutionStrategiesSolver(parameters: EvolutionStrategiesParameters) {
  const { EvolutionStrategiesSolver } = require("./evolution-strategies");
  return new EvolutionStrategiesSolver(parameters);
}

export function createEvolutionaryProgrammingSolver(parameters: EvolutionaryProgrammingParameters) {
  const { EvolutionaryProgrammingSolver } = require("./evolutionary-programming");
  return new EvolutionaryProgrammingSolver(parameters);
}
