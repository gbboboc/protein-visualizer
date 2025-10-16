import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { jobQueueService } from "@/lib/services/job-queue-service";
import connectDB from "@/lib/mongodb";

// GET /api/jobs/[id] - Get specific job status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobId = params.id;
    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    await connectDB();
    
    const jobStatus = await jobQueueService.getJobStatus(jobId);
    
    if (!jobStatus) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(jobStatus);

  } catch (error) {
    console.error("Error fetching job status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch job status" },
      { status: 500 }
    );
  }
}

// DELETE /api/jobs/[id] - Cancel job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobId = params.id;
    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    await connectDB();
    
    const cancelled = await jobQueueService.cancelJob(jobId);
    
    if (!cancelled) {
      return NextResponse.json({ error: "Job not found or could not be cancelled" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Job cancelled successfully" });

  } catch (error) {
    console.error("Error cancelling job:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel job" },
      { status: 500 }
    );
  }
}
