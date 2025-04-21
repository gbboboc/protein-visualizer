import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Protein from "@/lib/models/Protein"
import { convertDocToObj } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const isPublic = searchParams.get("isPublic") === "true"

    let query = {}
    if (userId) {
      query = { userId }
    } else if (isPublic) {
      query = { isPublic: true }
    }

    const proteins = await Protein.find(query).sort({ createdAt: -1 })
    return NextResponse.json(convertDocToObj(proteins))
  } catch (error) {
    console.error("Error fetching proteins:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch proteins" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const { userId, name, sequence, description, isPublic } = body

    if (!userId || !name || !sequence) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const protein = new Protein({
      userId,
      name,
      sequence,
      description,
      isPublic: isPublic || false,
    })

    const savedProtein = await protein.save()
    return NextResponse.json(convertDocToObj(savedProtein))
  } catch (error) {
    console.error("Error saving protein:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save protein" },
      { status: 500 }
    )
  }
}
