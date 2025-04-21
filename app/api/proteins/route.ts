import { type NextRequest, NextResponse } from "next/server"
import { db, executeQuery } from "@/lib/db"
import { proteins } from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get("userId")
  const isPublic = searchParams.get("isPublic") === "true"

  const result = await executeQuery(async () => {
    if (userId) {
      return await db
        .select()
        .from(proteins)
        .where(eq(proteins.userId, Number.parseInt(userId)))
    } else if (isPublic) {
      return await db.select().from(proteins).where(eq(proteins.isPublic, true))
    } else {
      return await db.select().from(proteins)
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
    const { userId, name, sequence, description, isPublic } = body

    if (!userId || !name || !sequence) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await executeQuery(async () => {
      return await db
        .insert(proteins)
        .values({
          userId,
          name,
          sequence,
          description,
          isPublic: isPublic || false,
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
