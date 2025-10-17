import { NextResponse, type NextRequest } from "next/server";

const SERVICE_URL = process.env.ROSETTA_SERVICE_URL || "http://localhost:8000";

export async function GET(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const res = await fetch(`${SERVICE_URL}/jobs/${params.jobId}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch job status" },
      { status: 500 }
    );
  }
}


