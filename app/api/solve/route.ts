import { NextRequest, NextResponse } from 'next/server';
import { ProteinSolverService, type SolverConfig } from '@/lib/services/protein-solver-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config: SolverConfig = body;

    // Validate input
    const sequenceValidation = ProteinSolverService.validateSequence(config.sequence);
    if (!sequenceValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid sequence', details: sequenceValidation.errors },
        { status: 400 }
      );
    }

    if (config.initialDirections) {
      const directionsValidation = ProteinSolverService.validateDirections(
        config.initialDirections, 
        config.sequence.length
      );
      if (!directionsValidation.isValid) {
        return NextResponse.json(
          { error: 'Invalid directions', details: directionsValidation.errors },
          { status: 400 }
        );
      }
    }

    // Run solver
    const service = new ProteinSolverService();
    const result = await service.solve(config);

    return NextResponse.json({
      success: true,
      result: {
        bestConformation: {
          sequence: result.bestConformation.sequence,
          directions: result.bestConformation.directions,
          energy: result.bestConformation.energy,
          positions: result.bestConformation.positions
        },
        totalIterations: result.totalIterations,
        convergenceTime: result.convergenceTime,
        energyHistory: result.energyHistory
      }
    });

  } catch (error) {
    console.error('Solver API error:', error);
    return NextResponse.json(
      { error: 'Solver execution failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
    return NextResponse.json({
    message: 'Protein Solver API',
    endpoints: {
      'POST /api/solve': 'Solve protein folding problem',
      'GET /api/solve/validate': 'Validate sequence and directions'
    },
      algorithms: ['monte-carlo', 'simulated-annealing', 'ga']
  });
}


