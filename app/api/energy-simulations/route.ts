import { type NextRequest, NextResponse } from "next/server"
import { db, executeQuery } from "@/lib/db"
import { energySimulations } from "@/lib/schema"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const proteinId = searchParams.get("proteinId")

  const result = await executeQuery(async () => {
    if (proteinId) {
      return await db
        .select()
        .from(energySimulations)
        .where(eq(energySimulations.proteinId, Number.parseInt(proteinId)))
    } else {
      return await db.select().from(energySimulations)
    }
  })

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json(result.data)
}

export async function POST(request: NextRequest) {
  try {
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

    const result = await executeQuery(async () => {
      return await db
        .insert(energySimulations)
        .values({
          proteinId,
          algorithmType,
          initialEnergy,
          finalEnergy,
          iterations,
          temperature,
          resultSequence,
          resultDirections,
        })
        .returning()
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
