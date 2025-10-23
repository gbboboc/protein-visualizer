/**
 * Structure Analysis Utilities
 * Calculate RMSD, energy comparisons, and structural metrics
 */

import type { ParsedPDB } from "./pdb-parser";
import type { Direction } from "../types";

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface StructureMetrics {
  rmsd: number;
  atomCount: number;
  bondCount: number;
  residueCount: number;
  energyDifference?: number;
}

export interface ComparisonResult {
  metrics: StructureMetrics;
  alignmentQuality: "excellent" | "good" | "moderate" | "poor";
  notes: string[];
}

/**
 * Calculate Root Mean Square Deviation (RMSD) between two structures
 * Uses CA atoms for comparison
 */
export function calculateRMSD(structure1: ParsedPDB, structure2: ParsedPDB): number {
  // Get CA atoms from both structures
  const ca1 = structure1.atoms.filter(atom => atom.name === 'CA').sort((a, b) => a.resSeq - b.resSeq);
  const ca2 = structure2.atoms.filter(atom => atom.name === 'CA').sort((a, b) => a.resSeq - b.resSeq);
  
  if (ca1.length === 0 || ca2.length === 0) {
    console.warn('No CA atoms found for RMSD calculation');
    return 0;
  }
  
  // Use the minimum number of atoms
  const n = Math.min(ca1.length, ca2.length);
  
  if (n === 0) return 0;
  
  // Center both structures
  const center1 = centerOfMass(ca1);
  const center2 = centerOfMass(ca2);
  
  // Calculate squared deviations
  let sumSquaredDist = 0;
  for (let i = 0; i < n; i++) {
    const dx = (ca1[i].x - center1.x) - (ca2[i].x - center2.x);
    const dy = (ca1[i].y - center1.y) - (ca2[i].y - center2.y);
    const dz = (ca1[i].z - center1.z) - (ca2[i].z - center2.z);
    sumSquaredDist += dx * dx + dy * dy + dz * dz;
  }
  
  // RMSD = sqrt(sum of squared distances / n)
  return Math.sqrt(sumSquaredDist / n);
}

/**
 * Calculate center of mass for a set of atoms
 */
function centerOfMass(atoms: Array<{ x: number; y: number; z: number }>): Position3D {
  if (atoms.length === 0) return { x: 0, y: 0, z: 0 };
  
  const sum = atoms.reduce(
    (acc, atom) => ({
      x: acc.x + atom.x,
      y: acc.y + atom.y,
      z: acc.z + atom.z,
    }),
    { x: 0, y: 0, z: 0 }
  );
  
  return {
    x: sum.x / atoms.length,
    y: sum.y / atoms.length,
    z: sum.z / atoms.length,
  };
}

/**
 * Calculate RMSD between HP lattice model and PDB structure
 */
export function calculateHPtoPDBRMSD(
  sequence: string,
  directions: Direction[],
  pdbData: ParsedPDB
): number {
  // Build HP lattice positions
  const hpPositions = buildHPLattice(sequence, directions);
  
  // Get CA atoms from PDB
  const caAtoms = pdbData.atoms
    .filter(atom => atom.name === 'CA')
    .sort((a, b) => a.resSeq - b.resSeq);
  
  if (hpPositions.length === 0 || caAtoms.length === 0) return 0;
  
  const n = Math.min(hpPositions.length, caAtoms.length);
  
  // Center both structures
  const hpCenter = centerOfMass(hpPositions);
  const pdbCenter = centerOfMass(caAtoms);
  
  // Calculate RMSD
  let sumSquaredDist = 0;
  for (let i = 0; i < n; i++) {
    const dx = (hpPositions[i].x - hpCenter.x) - (caAtoms[i].x - pdbCenter.x);
    const dy = (hpPositions[i].y - hpCenter.y) - (caAtoms[i].y - pdbCenter.y);
    const dz = (hpPositions[i].z - hpCenter.z) - (caAtoms[i].z - pdbCenter.z);
    sumSquaredDist += dx * dx + dy * dy + dz * dz;
  }
  
  return Math.sqrt(sumSquaredDist / n);
}

/**
 * Build HP lattice positions from sequence and directions
 */
function buildHPLattice(sequence: string, directions: Direction[]): Position3D[] {
  const positions: Position3D[] = [];
  
  // Start at origin
  positions.push({ x: 0, y: 0, z: 0 });
  
  // Direction vectors (2D lattice: L, R, U, D)
  const directionMap: Record<Direction, Position3D> = {
    'R': { x: 1, y: 0, z: 0 },
    'L': { x: -1, y: 0, z: 0 },
    'U': { x: 0, y: 1, z: 0 },
    'D': { x: 0, y: -1, z: 0 },
  };
  
  // Build positions based on directions
  for (let i = 0; i < Math.min(directions.length, sequence.length - 1); i++) {
    const prevPos = positions[i];
    const dir = directionMap[directions[i]];
    
    if (dir) {
      positions.push({
        x: prevPos.x + dir.x,
        y: prevPos.y + dir.y,
        z: prevPos.z + dir.z,
      });
    }
  }
  
  return positions;
}

/**
 * Compare two structures and provide analysis
 */
export function compareStructures(
  structure1: ParsedPDB,
  structure2: ParsedPDB,
  energy1?: number,
  energy2?: number
): ComparisonResult {
  const rmsd = calculateRMSD(structure1, structure2);
  
  // Determine alignment quality based on RMSD
  let alignmentQuality: "excellent" | "good" | "moderate" | "poor";
  if (rmsd < 2.0) alignmentQuality = "excellent";
  else if (rmsd < 4.0) alignmentQuality = "good";
  else if (rmsd < 8.0) alignmentQuality = "moderate";
  else alignmentQuality = "poor";
  
  const notes: string[] = [];
  
  // RMSD interpretation
  if (rmsd < 1.0) {
    notes.push("Structures are nearly identical");
  } else if (rmsd < 2.0) {
    notes.push("Structures are very similar - excellent agreement");
  } else if (rmsd < 4.0) {
    notes.push("Structures share similar overall fold");
  } else if (rmsd < 8.0) {
    notes.push("Structures have moderate similarity");
  } else {
    notes.push("Structures are significantly different");
  }
  
  // Energy comparison
  let energyDifference: number | undefined;
  if (energy1 !== undefined && energy2 !== undefined) {
    energyDifference = Math.abs(energy1 - energy2);
    if (energyDifference < 10) {
      notes.push("Energy values are very close");
    } else if (energyDifference < 50) {
      notes.push("Energy values are reasonably similar");
    } else {
      notes.push("Energy values differ significantly");
    }
  }
  
  // Atom count comparison
  if (structure1.atoms.length !== structure2.atoms.length) {
    notes.push(`Different atom counts: ${structure1.atoms.length} vs ${structure2.atoms.length}`);
  }
  
  return {
    metrics: {
      rmsd,
      atomCount: Math.max(structure1.atoms.length, structure2.atoms.length),
      bondCount: Math.max(structure1.bonds.length, structure2.bonds.length),
      residueCount: Math.max(
        structure1.atoms.filter(a => a.name === 'CA').length,
        structure2.atoms.filter(a => a.name === 'CA').length
      ),
      energyDifference,
    },
    alignmentQuality,
    notes,
  };
}

/**
 * Analyze HP model accuracy compared to Rosetta result
 */
export function analyzeHPAccuracy(
  sequence: string,
  directions: Direction[],
  rosettaPDB: ParsedPDB,
  hpEnergy?: number,
  rosettaEnergy?: number
): ComparisonResult {
  const rmsd = calculateHPtoPDBRMSD(sequence, directions, rosettaPDB);
  
  let alignmentQuality: "excellent" | "good" | "moderate" | "poor";
  if (rmsd < 3.0) alignmentQuality = "excellent";
  else if (rmsd < 6.0) alignmentQuality = "good";
  else if (rmsd < 10.0) alignmentQuality = "moderate";
  else alignmentQuality = "poor";
  
  const notes: string[] = [];
  
  // RMSD interpretation for HP vs Rosetta
  if (rmsd < 2.0) {
    notes.push("HP model prediction is highly accurate!");
  } else if (rmsd < 4.0) {
    notes.push("HP model captures the general fold well");
  } else if (rmsd < 8.0) {
    notes.push("HP model provides a reasonable approximation");
  } else {
    notes.push("HP model differs significantly from Rosetta result");
  }
  
  // Add context about HP model limitations
  notes.push("Note: HP lattice models simplify protein structure to a grid");
  
  let energyDifference: number | undefined;
  if (hpEnergy !== undefined && rosettaEnergy !== undefined) {
    energyDifference = Math.abs(hpEnergy - rosettaEnergy);
    notes.push("Energy scales differ between HP and all-atom models");
  }
  
  return {
    metrics: {
      rmsd,
      atomCount: rosettaPDB.atoms.length,
      bondCount: rosettaPDB.bonds.length,
      residueCount: sequence.length,
      energyDifference,
    },
    alignmentQuality,
    notes,
  };
}

