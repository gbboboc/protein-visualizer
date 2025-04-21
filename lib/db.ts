import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

// Initialize the SQL client
const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql)

// Helper function to handle database errors
export async function executeQuery<T>(queryFn: () => Promise<T>): Promise<{ data: T | null; error: string | null }> {
  try {
    const result = await queryFn()
    return { data: result, error: null }
  } catch (error) {
    console.error("Database error:", error)
    return {
      data: null,
      error: error instanceof Error ? error.message : "An unknown database error occurred",
    }
  }
}
