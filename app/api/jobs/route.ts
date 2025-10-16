import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { jobQueueService } from "@/lib/services/job-queue-service";
import { JobSubmissionResponse } from "@/lib/types/job-types";
import { jobSubmissionRateLimiter, rosettaJobRateLimiter, getClientIdentifier } from "@/lib/middleware/rate-limiter";
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

    // Rate limiting check
    const identifier = getClientIdentifier(request);
    const rateLimitResult = jobSubmissionRateLimiter.check(identifier);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Too many job submissions. Please wait before submitting another job.",
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      );
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

    // Additional rate limiting for Rosetta jobs (more restrictive)
    if (algorithm === 'rosetta') {
      const rosettaRateLimitResult = rosettaJobRateLimiter.check(identifier);
      
      if (!rosettaRateLimitResult.allowed) {
        return NextResponse.json(
          { 
            error: "Rosetta jobs are computationally expensive. You can submit up to 3 per hour.",
            retryAfter: Math.ceil((rosettaRateLimitResult.resetTime - Date.now()) / 1000)
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': '3',
              'X-RateLimit-Remaining': rosettaRateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rosettaRateLimitResult.resetTime.toString(),
              'Retry-After': Math.ceil((rosettaRateLimitResult.resetTime - Date.now()) / 1000).toString()
            }
          }
        );
      }
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

    const response = NextResponse.json({
      success: true,
      jobId: result.jobId,
      estimatedCompletion: result.estimatedCompletion
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', '10');
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    return response;

  } catch (error) {
    console.error("Error submitting job:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit job" },
      { status: 500 }
    );
  }
}
