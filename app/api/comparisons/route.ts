import { type NextRequest, NextResponse } from "next/server"
import { db, executeQuery } from "@/lib/db"
import { comparisons, comparisonProteins } from "@/lib/schema"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get("userId")

  const result = await executeQuery(async () => {
    if (userId) {
      return await db
        .select()
        .from(comparisons)
        .where(eq(comparisons.userId, Number.parseInt(userId)))
    } else {
      return await db.select().from(comparisons)
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
    const { userId, name, description, proteinIds } = body

    if (!userId || !name || !proteinIds || !Array.isArray(proteinIds)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await executeQuery(async () => {
      // Create the comparison
      const [newComparison] = await db
        .insert(comparisons)
        .values({
          userId,
          name,
          description,
        })
        .returning()

      // Add proteins to the comparison
      if (newComparison) {
        for (const proteinId of proteinIds) {
          await db.insert(comparisonProteins).values({
            comparisonId: newComparison.id,
            proteinId,
          })
        }
      }

      return newComparison
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
