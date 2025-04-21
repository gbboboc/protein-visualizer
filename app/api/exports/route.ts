import { type NextRequest, NextResponse } from "next/server"
import { db, executeQuery } from "@/lib/db"
import { savedExports } from "@/lib/schema"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get("userId")

  const result = await executeQuery(async () => {
    if (userId) {
      return await db
        .select()
        .from(savedExports)
        .where(eq(savedExports.userId, Number.parseInt(userId)))
    } else {
      return await db.select().from(savedExports)
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
    const { userId, proteinId, exportType, filePath } = body

    if (!userId || !exportType || !filePath) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await executeQuery(async () => {
      return await db
        .insert(savedExports)
        .values({
          userId,
          proteinId,
          exportType,
          filePath,
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
