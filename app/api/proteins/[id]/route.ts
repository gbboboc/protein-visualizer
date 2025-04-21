import { type NextRequest, NextResponse } from "next/server"
import { db, executeQuery } from "@/lib/db"
import { proteins } from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number.parseInt(params.id)

  const result = await executeQuery(async () => {
    return await db.select().from(proteins).where(eq(proteins.id, id))
  })

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (!result.data || result.data.length === 0) {
    return NextResponse.json({ error: "Protein not found" }, { status: 404 })
  }

  return NextResponse.json(result.data[0])
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()
    const { name, sequence, description, isPublic } = body

    const result = await executeQuery(async () => {
      return await db
        .update(proteins)
        .set({
          name,
          sequence,
          description,
          isPublic,
          updatedAt: new Date(),
        })
        .where(eq(proteins.id, id))
        .returning()
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    if (!result.data || result.data.length === 0) {
      return NextResponse.json({ error: "Protein not found" }, { status: 404 })
    }

    return NextResponse.json(result.data[0])
  } catch (error) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number.parseInt(params.id)

  const result = await executeQuery(async () => {
    return await db.delete(proteins).where(eq(proteins.id, id)).returning()
  })

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (!result.data || result.data.length === 0) {
    return NextResponse.json({ error: "Protein not found" }, { status: 404 })
  }

  return NextResponse.json({ message: "Protein deleted successfully" })
}
