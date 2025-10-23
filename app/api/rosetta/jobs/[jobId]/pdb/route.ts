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
    
    if (rosettaJob.status !== 'succeeded') {
      return NextResponse.json({ error: "Job not completed" }, { status: 400 });
    }
    
    // If PDB content is stored in database, return it
    if (rosettaJob.pdbContent) {
      return new NextResponse(rosettaJob.pdbContent, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${jobId}.pdb"`,
        },
      });
    }
    
    // Otherwise, fetch from service and store in database
    try {
      const res = await fetch(`${SERVICE_URL}/jobs/${jobId}/pdb`);
      if (!res.ok) {
        return NextResponse.json({ error: "PDB not available" }, { status: 404 });
      }
      
      const pdbContent = await res.text();
      
      // Store PDB content in database for future use
      rosettaJob.pdbContent = pdbContent;
      await rosettaJob.save();
      
      return new NextResponse(pdbContent, {
        status: 200,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${jobId}.pdb"`,
        },
      });
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to fetch PDB from service" },
        { status: 500 }
      );
    }
  } catch (e) {
    console.error('Error in GET /api/rosetta/jobs/[jobId]/pdb:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch PDB" },
      { status: 500 }
    );
  }
}


