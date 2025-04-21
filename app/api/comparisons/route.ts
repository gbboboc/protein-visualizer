import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Comparison from "@/lib/models/Comparison"
import { convertDocToObj } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    const query = userId ? { userId } : {}
    const comparisons = await Comparison.find(query)
      .populate('proteins')
      .sort({ createdAt: -1 })

    return NextResponse.json(convertDocToObj(comparisons))
  } catch (error) {
    console.error("Error fetching comparisons:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch comparisons" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { userId, name, description, proteinIds } = body

    if (!userId || !name || !proteinIds || !Array.isArray(proteinIds)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const comparison = new Comparison({
      userId,
      name,
      description,
      proteins: proteinIds,
    })

    const savedComparison = await comparison.save()
    const populatedComparison = await Comparison.findById(savedComparison._id).populate('proteins')
    
    return NextResponse.json(convertDocToObj(populatedComparison))
  } catch (error) {
    console.error("Error saving comparison:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save comparison" },
      { status: 500 }
    )
  }
}
