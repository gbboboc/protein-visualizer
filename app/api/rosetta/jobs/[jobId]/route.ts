import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/auth.config";
import connectDB from "@/lib/mongodb";
import RosettaJob from "@/lib/models/RosettaJob";
import mongoose from "mongoose";

const SERVICE_URL = process.env.ROSETTA_SERVICE_URL || "http://localhost:8000";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await context.params;
    
    // Connect to database
    await connectDB();
    
    // Ensure database connection is established
    if (!mongoose.connection.readyState) {
      throw new Error('Database connection not established');
    }
    
    // Get job from database
    const rosettaJob = await RosettaJob.findOne({ 
      jobId, 
      userId: new mongoose.Types.ObjectId(session.user.id) 
    });
    
    if (!rosettaJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    
    // If job is still queued or running, check with service for updates
    if (rosettaJob.status === 'queued' || rosettaJob.status === 'running') {
      try {
        const res = await fetch(`${SERVICE_URL}/jobs/${jobId}`);
        if (res.ok) {
          const serviceData = await res.json();
          
          // Update database with service status
          rosettaJob.status = serviceData.status;
          if (serviceData.errorMessage) {
            rosettaJob.errorMessage = serviceData.errorMessage;
          }
          if (serviceData.status === 'succeeded' || serviceData.status === 'failed') {
            rosettaJob.completedAt = new Date();
          }
          await rosettaJob.save();
        }
      } catch (e) {
        // Service might be down, return database status
        console.warn('Rosetta service unavailable, returning database status');
      }
    }
    
    return NextResponse.json({
      jobId: rosettaJob.jobId,
      status: rosettaJob.status,
      errorMessage: rosettaJob.errorMessage,
      createdAt: rosettaJob.createdAt,
      completedAt: rosettaJob.completedAt
    });
  } catch (e) {
    console.error('Error in GET /api/rosetta/jobs/[jobId]:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch job status" },
      { status: 500 }
    );
  }
}


