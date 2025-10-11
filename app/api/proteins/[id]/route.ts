import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Protein from "@/lib/models/Protein"
import { convertDocToObj } from "@/lib/utils"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const protein = await Protein.findById(params.id)
    
    if (!protein) {
      return NextResponse.json({ error: "Protein not found" }, { status: 404 })
    }

    return NextResponse.json(convertDocToObj(protein))
  } catch (error) {
    console.error("Error fetching protein:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch protein" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const body = await request.json()
    const { name, sequence, description, isPublic, directions } = body

    // Ensure directions is an array
    const directionsArray = Array.isArray(directions) ? directions : []

    const protein = await Protein.findByIdAndUpdate(
      params.id,
      {
        name,
        sequence,
        description,
        isPublic,
        directions: directionsArray,
        updatedAt: new Date(),
      },
      { new: true }
    )

    if (!protein) {
      return NextResponse.json({ error: "Protein not found" }, { status: 404 })
    }

    return NextResponse.json(convertDocToObj(protein))
  } catch (error) {
    console.error("Error updating protein:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update protein" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const protein = await Protein.findByIdAndDelete(params.id)

    if (!protein) {
      return NextResponse.json({ error: "Protein not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Protein deleted successfully" })
  } catch (error) {
    console.error("Error deleting protein:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete protein" },
      { status: 500 }
    )
  }
}
