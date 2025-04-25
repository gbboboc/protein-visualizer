import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Comparison from "@/lib/models/Comparison"
import { convertDocToObj } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const comparisons = await Comparison.find({ userId })
    const formattedComparisons = comparisons.map(comparison => ({
      ...convertDocToObj(comparison),
      proteins: comparison.proteins // proteins is already an array of IDs
    }))

    return NextResponse.json(formattedComparisons)
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
      proteins: proteinIds, // Store protein IDs directly
    })

    const savedComparison = await comparison.save()
    
    return NextResponse.json({
      ...convertDocToObj(savedComparison),
      proteins: proteinIds
    })
  } catch (error) {
    console.error("Error saving comparison:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save comparison" },
      { status: 500 }
    )
  }
}
