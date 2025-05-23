import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Protein from "@/lib/models/Protein"
import { convertDocToObj } from "@/lib/utils"
import mongoose from "mongoose"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const isPublic = searchParams.get("isPublic") === "true"
    const id = searchParams.get("id")

    // If an ID is provided, fetch a single protein
    if (id) {
      const protein = await Protein.findById(id)
      if (!protein) {
        return NextResponse.json({ error: "Protein not found" }, { status: 404 })
      }
      return NextResponse.json(convertDocToObj(protein))
    }

    // Otherwise, fetch all proteins based on filters
    let query = {}
    if (userId) {
      query = { userId: new mongoose.Types.ObjectId(userId) }
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
    const { userId, name, sequence, description, isPublic, directions } = body

    if (!userId || !name || !sequence) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Ensure directions is an array
    const directionsArray = Array.isArray(directions) ? directions : []

    const protein = new Protein({
      userId: new mongoose.Types.ObjectId(userId),
      name,
      sequence,
      description: description || '',
      isPublic: isPublic || false,
      directions: directionsArray,
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
