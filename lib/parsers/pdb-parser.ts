/**
 * PDB File Parser
 * Parses PDB format files and extracts atomic coordinates and bonds
 */

export interface Atom {
  serial: number;        // Atom serial number
  name: string;          // Atom name (e.g., "CA", "N", "C", "O")
  resName: string;       // Residue name (e.g., "ALA", "GLY")
  chainID: string;       // Chain identifier
  resSeq: number;        // Residue sequence number
  x: number;             // X coordinate
  y: number;             // Y coordinate
  z: number;             // Z coordinate
  element: string;       // Element symbol (e.g., "C", "N", "O")
  occupancy: number;     // Occupancy
  tempFactor: number;    // Temperature factor
}

export interface ParsedPDB {
  atoms: Atom[];
  bonds: [number, number][]; // Pairs of atom indices
  chains: string[];
  title: string;
  sequence: string;
}

/**
 * Parse PDB file content
 */
export function parsePDB(pdbText: string): ParsedPDB {
  const lines = pdbText.split('\n');
  const atoms: Atom[] = [];
  const chains = new Set<string>();
  let title = '';
  const atomSerialMap = new Map<number, number>(); // Maps serial number to array index

  for (const line of lines) {
    const recordType = line.substring(0, 6).trim();

    // Parse TITLE record
    if (recordType === 'TITLE') {
      title = line.substring(10).trim();
    }

    // Parse ATOM records
    if (recordType === 'ATOM' || recordType === 'HETATM') {
      const atom: Atom = {
        serial: parseInt(line.substring(6, 11).trim()),
        name: line.substring(12, 16).trim(),
        resName: line.substring(17, 20).trim(),
        chainID: line.substring(21, 22).trim(),
        resSeq: parseInt(line.substring(22, 26).trim()),
        x: parseFloat(line.substring(30, 38).trim()),
        y: parseFloat(line.substring(38, 46).trim()),
        z: parseFloat(line.substring(46, 54).trim()),
        occupancy: parseFloat(line.substring(54, 60).trim() || '1.0'),
        tempFactor: parseFloat(line.substring(60, 66).trim() || '0.0'),
        element: line.substring(76, 78).trim() || guessElement(line.substring(12, 16).trim()),
      };

      atomSerialMap.set(atom.serial, atoms.length);
      atoms.push(atom);
      chains.add(atom.chainID);
    }
  }

  // Parse CONECT records for explicit bonds
  const explicitBonds = new Set<string>();
  for (const line of lines) {
    const recordType = line.substring(0, 6).trim();
    if (recordType === 'CONECT') {
      const serial1 = parseInt(line.substring(6, 11).trim());
      const idx1 = atomSerialMap.get(serial1);
      if (idx1 === undefined) continue;

      // Parse bonded atoms (can be multiple per CONECT record)
      for (let i = 11; i < line.length; i += 5) {
        const bondedSerial = parseInt(line.substring(i, i + 5).trim());
        if (isNaN(bondedSerial)) continue;

        const idx2 = atomSerialMap.get(bondedSerial);
        if (idx2 === undefined) continue;

        // Store bonds in sorted order to avoid duplicates
        const bondKey = idx1 < idx2 ? `${idx1}-${idx2}` : `${idx2}-${idx1}`;
        explicitBonds.add(bondKey);
      }
    }
  }

  // Convert explicit bonds to array
  const bonds: [number, number][] = Array.from(explicitBonds).map(key => {
    const [a, b] = key.split('-').map(Number);
    return [a, b];
  });

  // If no CONECT records, calculate bonds based on distance
  if (bonds.length === 0 && atoms.length > 0) {
    const calculatedBonds = calculateBonds(atoms);
    bonds.push(...calculatedBonds);
  }

  // Extract sequence from CA atoms
  const sequence = atoms
    .filter(atom => atom.name === 'CA')
    .sort((a, b) => a.resSeq - b.resSeq)
    .map(atom => atom.resName)
    .join('');

  return {
    atoms,
    bonds,
    chains: Array.from(chains),
    title,
    sequence,
  };
}

/**
 * Guess element from atom name
 */
function guessElement(atomName: string): string {
  const name = atomName.trim();
  if (name.startsWith('C')) return 'C';
  if (name.startsWith('N')) return 'N';
  if (name.startsWith('O')) return 'O';
  if (name.startsWith('S')) return 'S';
  if (name.startsWith('P')) return 'P';
  if (name.startsWith('H')) return 'H';
  return 'C'; // Default to carbon
}

/**
 * Calculate bonds based on distance (used when CONECT records are missing)
 */
function calculateBonds(atoms: Atom[]): [number, number][] {
  const bonds: [number, number][] = [];
  const maxBondDistance = 1.8; // Maximum bond distance in Angstroms

  // Only calculate bonds between consecutive residues and within residues
  for (let i = 0; i < atoms.length; i++) {
    for (let j = i + 1; j < atoms.length; j++) {
      const atom1 = atoms[i];
      const atom2 = atoms[j];

      // Skip if atoms are from different chains or too far apart in sequence
      if (atom1.chainID !== atom2.chainID) continue;
      if (Math.abs(atom1.resSeq - atom2.resSeq) > 1) continue;

      // Calculate distance
      const dx = atom1.x - atom2.x;
      const dy = atom1.y - atom2.y;
      const dz = atom1.z - atom2.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // If within bonding distance, add bond
      if (distance <= maxBondDistance) {
        bonds.push([i, j]);
      }
    }
  }

  return bonds;
}

/**
 * Get element color for visualization
 */
export function getElementColor(element: string): string {
  const colors: Record<string, string> = {
    'C': '#909090', // Carbon - gray
    'N': '#3050F8', // Nitrogen - blue
    'O': '#FF0D0D', // Oxygen - red
    'S': '#FFFF30', // Sulfur - yellow
    'P': '#FF8000', // Phosphorus - orange
    'H': '#FFFFFF', // Hydrogen - white
  };
  return colors[element] || '#FF00FF'; // Magenta for unknown
}

/**
 * Get van der Waals radius for element
 */
export function getVdwRadius(element: string): number {
  const radii: Record<string, number> = {
    'C': 1.70,
    'N': 1.55,
    'O': 1.52,
    'S': 1.80,
    'P': 1.80,
    'H': 1.20,
  };
  return radii[element] || 1.70;
}

