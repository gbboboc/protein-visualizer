import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Comparison from "@/lib/models/Comparison"
import { convertDocToObj } from "@/lib/utils"
import mongoose from "mongoose"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    const comparison = await Comparison.findById(params.id)
      .populate('proteins')
      .populate('userId', 'name email')

    if (!comparison) {
      return NextResponse.json({ error: "Comparison not found" }, { status: 404 })
    }

    return NextResponse.json(convertDocToObj(comparison))
  } catch (error) {
    console.error("Error fetching comparison:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch comparison" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    const body = await request.json()
    const { name, description, proteinIds } = body

    const comparison = await Comparison.findByIdAndUpdate(
      params.id,
      {
        name,
        description,
        proteins: proteinIds,
        updatedAt: new Date(),
      },
      { new: true }
    ).populate('proteins')

    if (!comparison) {
      return NextResponse.json({ error: "Comparison not found" }, { status: 404 })
    }

    return NextResponse.json(convertDocToObj(comparison))
  } catch (error) {
    console.error("Error updating comparison:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update comparison" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    const comparison = await Comparison.findByIdAndDelete(params.id)

    if (!comparison) {
      return NextResponse.json({ error: "Comparison not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Comparison deleted successfully" })
  } catch (error) {
    console.error("Error deleting comparison:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete comparison" },
      { status: 500 }
    )
  }
} 