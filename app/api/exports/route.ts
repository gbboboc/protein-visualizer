import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Export from "@/lib/models/Export"
import { convertDocToObj } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    const query = userId ? { userId } : {}
    const exports = await Export.find(query)
      .populate('proteinId')
      .sort({ createdAt: -1 })

    return NextResponse.json(convertDocToObj(exports))
  } catch (error) {
    console.error("Error fetching exports:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch exports" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { userId, proteinId, exportType, filePath } = body

    if (!userId || !exportType || !filePath) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const exportDoc = new Export({
      userId,
      proteinId,
      exportType,
      filePath,
    })

    const savedExport = await exportDoc.save()
    const populatedExport = await Export.findById(savedExport._id).populate('proteinId')
    
    return NextResponse.json(convertDocToObj(populatedExport))
  } catch (error) {
    console.error("Error saving export:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save export" },
      { status: 500 }
    )
  }
}
