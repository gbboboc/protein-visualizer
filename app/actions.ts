'use server'

import connectDB from '@/lib/mongodb'
import Protein from '@/lib/models/Protein'
import { IProtein, ProteinInput } from '@/lib/types'
import { convertDocToObj } from '@/lib/utils'

export async function getPublicProteins(): Promise<{ data: IProtein[] | null; error: string | null }> {
  try {
    await connectDB()
    const proteins = await Protein.find({ isPublic: true }).sort({ createdAt: -1 })
    return { data: convertDocToObj(proteins), error: null }
  } catch (error) {
    console.error("Error fetching proteins:", error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : "Failed to fetch proteins" 
    }
  }
}

export async function saveProtein(data: ProteinInput): Promise<{ data: IProtein | null; error: string | null }> {
  try {
    await connectDB()
    const protein = new Protein(data)
    const savedProtein = await protein.save()
    return { data: savedProtein, error: null }
  } catch (error) {
    console.error("Error saving protein:", error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : "Failed to save protein" 
    }
  }
}

export async function getProteinById(id: string): Promise<{ data: IProtein | null; error: string | null }> {
  try {
    await connectDB()
    const protein = await Protein.findById(id)
    if (!protein) {
      throw new Error('Protein not found')
    }
    return { data: convertDocToObj(protein), error: null }
  } catch (error) {
    console.error("Error fetching protein:", error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : "Failed to fetch protein" 
    }
  }
}

export async function updateProtein(
  id: string, 
  data: Partial<ProteinInput>
): Promise<{ data: IProtein | null; error: string | null }> {
  try {
    await connectDB()
    const protein = await Protein.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    )
    if (!protein) {
      throw new Error('Protein not found')
    }
    return { data: protein, error: null }
  } catch (error) {
    console.error("Error updating protein:", error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : "Failed to update protein" 
    }
  }
}

export async function deleteProtein(id: string): Promise<{ data: IProtein | null; error: string | null }> {
  try {
    await connectDB()
    const protein = await Protein.findByIdAndDelete(id)
    if (!protein) {
      throw new Error('Protein not found')
    }
    return { data: protein, error: null }
  } catch (error) {
    console.error("Error deleting protein:", error)
    return { 
      data: null, 
      error: error instanceof Error ? error.message : "Failed to delete protein" 
    }
  }
} 