import { type NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import EnergySimulation from "@/lib/models/EnergySimulation"
import { convertDocToObj } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const searchParams = request.nextUrl.searchParams
    const proteinId = searchParams.get("proteinId")

    const query = proteinId ? { proteinId } : {}
    const simulations = await EnergySimulation.find(query)
      .populate('proteinId')
      .sort({ createdAt: -1 })

    const res = NextResponse.json(convertDocToObj(simulations))
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    )
    return res
  } catch (error) {
    console.error("Error fetching energy simulations:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch energy simulations" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const {
      proteinId,
      algorithmType,
      initialEnergy,
      finalEnergy,
      iterations,
      temperature,
      resultSequence,
      resultDirections,
    } = body

    if (!proteinId || !algorithmType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const simulation = new EnergySimulation({
      proteinId,
      algorithmType,
      initialEnergy,
      finalEnergy,
      iterations,
      temperature,
      resultSequence,
      resultDirections,
    })

    const savedSimulation = await simulation.save()
    const populatedSimulation = await EnergySimulation.findById(savedSimulation._id).populate('proteinId')
    
    return NextResponse.json(convertDocToObj(populatedSimulation))
  } catch (error) {
    console.error("Error saving energy simulation:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save energy simulation" },
      { status: 500 }
    )
  }
}
