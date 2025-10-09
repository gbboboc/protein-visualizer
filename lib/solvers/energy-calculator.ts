import { Direction } from "../types";
import { directionToPosition } from "../utils";
import { Position, Conformation } from "./types";

export class EnergyCalculator {
  /**
   * Calculates the energy of a protein conformation using the standard HP model
   * Energy is based on H-H contacts between non-adjacent residues
   * Each H-H contact contributes -1 to the total energy
   */
  static calculateEnergy(sequence: string, directions: Direction[]): number {
    const positions = this.calculatePositions(sequence, directions);
    
    // Check for invalid configuration (self-intersection)
    if (this.hasSelfIntersection(positions)) {
      return Number.POSITIVE_INFINITY;
    }

    return this.calculateContactEnergy(sequence, positions);
  }

  /**
   * Creates a full conformation object with positions and energy
   */
  static createConformation(sequence: string, directions: Direction[]): Conformation {
    const positions = this.calculatePositions(sequence, directions);
    const energy = this.hasSelfIntersection(positions) 
      ? Number.POSITIVE_INFINITY 
      : this.calculateContactEnergy(sequence, positions);

    return {
      sequence,
      directions,
      energy,
      positions
    };
  }

  static calculatePositions(sequence: string, directions: Direction[]): Position[] {
    const positions: Position[] = [];
    
    // Start with the first amino acid at the origin
    positions.push({ x: 0, y: 0, z: 0 });

    // Place each subsequent amino acid based on the directions
    for (let i = 1; i < sequence.length; i++) {
      const prevPos = positions[i - 1];
      const direction = directions[i - 1];

      const positionChange = directionToPosition(direction);
      const newPos: Position = {
        x: prevPos.x + positionChange.x,
        y: prevPos.y + positionChange.y,
        z: prevPos.z + positionChange.z,
      };

      positions.push(newPos);
    }

    return positions;
  }

  private static hasSelfIntersection(positions: Position[]): boolean {
    const occupied = new Set<string>();
    
    for (const pos of positions) {
      const posKey = `${pos.x},${pos.y},${pos.z}`;
      if (occupied.has(posKey)) {
        return true;
      }
      occupied.add(posKey);
    }
    
    return false;
  }

  private static calculateContactEnergy(sequence: string, positions: Position[]): number {
    let energy = 0;
    
    // Standard HP model: only H-H contacts contribute to energy
    // Each H-H contact contributes -1 to energy (stabilizing)
    for (let i = 0; i < sequence.length; i++) {
      if (sequence[i] === "H") {
        // Only check positions after i+1 to avoid double counting and adjacent contacts
        for (let j = i + 2; j < sequence.length; j++) {
          if (sequence[j] === "H") {
            // Check if positions are adjacent in space (Manhattan distance = 1)
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
  }
}
