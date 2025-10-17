import { NextResponse, type NextRequest } from "next/server";

const SERVICE_URL = process.env.ROSETTA_SERVICE_URL || "http://localhost:8000";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    const res = await fetch(`${SERVICE_URL}/jobs/${jobId}/pdb`);
    if (!res.ok) {
      const text = await res.text();
      return new NextResponse(text, { status: res.status });
    }
    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${jobId}.pdb"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch PDB" },
      { status: 500 }
    );
  }
}


