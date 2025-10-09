import { NextRequest, NextResponse } from 'next/server';
import { ProteinSolverService } from '@/lib/services/protein-solver-service';
import { Direction } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sequence, directions } = body;

    if (!sequence) {
      return NextResponse.json(
        { error: 'Sequence is required' },
        { status: 400 }
      );
    }

    // Validate sequence
    const sequenceValidation = ProteinSolverService.validateSequence(sequence);
    
    // Validate directions if provided
    let directionsValidation = { isValid: true, errors: [] };
    if (directions) {
      directionsValidation = ProteinSolverService.validateDirections(
        directions as Direction[], 
        sequence.length
      );
    }

    // Calculate energy if both sequence and directions are valid
    let energy: number | null = null;
    let isValidConfiguration = false;
    
    if (sequenceValidation.isValid && directionsValidation.isValid && directions) {
      try {
        energy = ProteinSolverService.calculateEnergy(sequence, directions as Direction[]);
        isValidConfiguration = energy !== Number.POSITIVE_INFINITY;
      } catch (error) {
        // Energy calculation failed
      }
    }

    return NextResponse.json({
      sequence: {
        isValid: sequenceValidation.isValid,
        errors: sequenceValidation.errors,
        length: sequence.length,
        hydrophobicCount: (sequence.match(/H/g) || []).length,
        polarCount: (sequence.match(/P/g) || []).length
      },
      directions: {
        isValid: directionsValidation.isValid,
        errors: directionsValidation.errors,
        provided: !!directions,
        count: directions?.length || 0
      },
      configuration: {
        isValid: isValidConfiguration,
        energy: energy,
        hasCollisions: energy === Number.POSITIVE_INFINITY
      }
    });

  } catch (error) {
    console.error('Validation API error:', error);
    return NextResponse.json(
      { error: 'Validation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


