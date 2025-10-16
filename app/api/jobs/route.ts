import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { jobQueueService } from "@/lib/services/job-queue-service";
import { JobSubmissionResponse } from "@/lib/types/job-types";
import connectDB from "@/lib/mongodb";

// GET /api/jobs - Get user's jobs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    
    const jobs = await jobQueueService.getUserJobs(session.user.id, limit);
    
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Error fetching user jobs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Submit new job
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { algorithm, sequence, parameters } = body;

    // Validate required fields
    if (!algorithm || !sequence) {
      return NextResponse.json(
        { error: "Missing required fields: algorithm, sequence" },
        { status: 400 }
      );
    }

    // Validate sequence (basic HP model validation)
    if (!/^[HP]+$/.test(sequence)) {
      return NextResponse.json(
        { error: "Invalid sequence. Must contain only H (hydrophobic) and P (polar) characters" },
        { status: 400 }
      );
    }

    if (sequence.length < 2) {
      return NextResponse.json(
        { error: "Sequence must have at least 2 residues" },
        { status: 400 }
      );
    }

    await connectDB();

    // Submit job to queue
    const result = await jobQueueService.submitJob({
      userId: session.user.id,
      algorithm,
      sequence,
      parameters: parameters || {},
      priority: parameters?.priority || 5 // Normal priority
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to submit job" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      estimatedCompletion: result.estimatedCompletion
    });

  } catch (error) {
    console.error("Error submitting job:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit job" },
      { status: 500 }
    );
  }
}
