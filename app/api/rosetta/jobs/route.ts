import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth.config";
import connectDB from "@/lib/mongodb";
import RosettaJob from "@/lib/models/RosettaJob";
import mongoose from "mongoose";

const SERVICE_URL = process.env.ROSETTA_SERVICE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Connect to database
    await connectDB();
    
    // Ensure database connection is established
    if (!mongoose.connection.readyState) {
      throw new Error('Database connection not established');
    }
    
    // Create job in database first
    const rosettaJob = new RosettaJob({
      jobId: body.jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID if not provided
      userId: new mongoose.Types.ObjectId(session.user.id),
      sequence: body.sequence,
      directions: body.directions || [],
      params: {
        protocol: body.params?.protocol || 'relax',
        repeats: body.params?.repeats || 1,
        seed: body.params?.seed,
        biasToDirections: body.params?.biasToDirections ?? true
      },
      status: 'queued'
    });
    
    await rosettaJob.save();
    
    // Send to Rosetta service
    const res = await fetch(`${SERVICE_URL}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        jobId: rosettaJob.jobId // Use the database-generated jobId
      }),
    });
    
    if (!res.ok) {
      // Update job status to failed if service call fails
      rosettaJob.status = 'failed';
      rosettaJob.errorMessage = 'Failed to queue job with Rosetta service';
      await rosettaJob.save();
      
      return NextResponse.json(
        { error: "Failed to queue job with Rosetta service" },
        { status: res.status }
      );
    }
    
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('Error in POST /api/rosetta/jobs:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to queue Rosetta job" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Connect to database
    await connectDB();
    
    // Get user's Rosetta jobs
    const jobs = await RosettaJob.find({ userId: new mongoose.Types.ObjectId(session.user.id) })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 jobs
    
    return NextResponse.json(jobs);
  } catch (e) {
    console.error('Error in GET /api/rosetta/jobs:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch Rosetta jobs" },
      { status: 500 }
    );
  }
}