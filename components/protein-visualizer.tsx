"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera } from "@react-three/drei"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Loader2, Save, Database, Download, Share2, BarChart2, Layers } from "lucide-react"

import ProteinModel from "@/components/protein-model"
import ProteinAnalysis from "@/components/protein-analysis"
import ProteinComparison from "@/components/protein-comparison"
import EnergyMinimization from "@/components/energy-minimization"
import ExportOptions from "@/components/export-options"

export type Direction = "left" | "right" | "up" | "down"
export type ProteinSequence = {
  id?: number
  name?: string
  sequence: string
  directions?: Direction[]
}

const ProteinVisualizer = () => {
  const [sequence, setSequence] = useState<string>("")
  const [directions, setDirections] = useState<string>("")
  const [proteinName, setProteinName] = useState<string>("My Protein")
  const [proteinData, setProteinData] = useState<ProteinSequence | null>(null)
  const [visualizationType, setVisualizationType] = useState<
    "2d" | "3d" | "ribbon" | "space-filling" | "stick" | "surface"
  >("3d")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [savedProteins, setSavedProteins] = useState<ProteinSequence[]>([])
  const [comparisonProteins, setComparisonProteins] = useState<ProteinSequence[]>([])
  const { toast } = useToast()

  // Load saved proteins from database on initial render
  useEffect(() => {
    const fetchSavedProteins = async () => {
      try {
        const response = await fetch("/api/proteins?isPublic=true")
        if (response.ok) {
          const data = await response.json()
          setSavedProteins(data)
        }
      } catch (error) {
        console.error("Error fetching saved proteins:", error)
      }
    }

    fetchSavedProteins()
  }, [])

  const handleVisualize = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate sequence (should only contain H and P)
    if (!/^[HP]+$/i.test(sequence)) {
      setError("Sequence must only contain H (hydrophobic) and P (polar) residues")
      return
    }

    // Parse directions if provided
    let parsedDirections: Direction[] | undefined = undefined

    if (directions.trim()) {
      try {
        parsedDirections = directions.split("-").map((dir) => {
          const d = dir.trim().toLowerCase()
          if (!["left", "right", "up", "down"].includes(d)) {
            throw new Error(`Invalid direction: ${dir}`)
          }
          return d as Direction
        })

        // Check if directions count is correct (should be sequence length - 1)
        if (parsedDirections.length !== sequence.length - 1) {
          setError(`Expected ${sequence.length - 1} directions, but got ${parsedDirections.length}`)
          return
        }
      } catch (err) {
        setError((err as Error).message)
        return
      }
    }

    setError(null)
    setProteinData({
      name: proteinName,
      sequence: sequence.toUpperCase(),
      directions: parsedDirections,
    })
  }

  const handleReset = () => {
    setSequence("")
    setDirections("")
    setProteinName("My Protein")
    setProteinData(null)
    setError(null)
  }

  const handleRandomSequence = () => {
    const length = Math.floor(Math.random() * 10) + 5 // Random length between 5-14
    let randomSeq = ""
    for (let i = 0; i < length; i++) {
      randomSeq += Math.random() > 0.5 ? "H" : "P"
    }
    setSequence(randomSeq)
  }

  const handleSaveProtein = async () => {
    if (!proteinData) return

    setLoading(true)
    try {
      const response = await fetch("/api/proteins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 1, // In a real app, this would be the authenticated user's ID
          name: proteinName,
          sequence: proteinData.sequence,
          description: `HP protein with ${proteinData.sequence.length} residues`,
          isPublic: true,
          directions: proteinData.directions ? proteinData.directions.join("-") : undefined,
        }),
      })

      if (response.ok) {
        const savedProtein = await response.json()
        setSavedProteins((prev) => [...prev, savedProtein])
        toast({
          title: "Protein Saved",
          description: `${proteinName} has been saved to the database.`,
        })
      } else {
        throw new Error("Failed to save protein")
      }
    } catch (error) {
      console.error("Error saving protein:", error)
      toast({
        title: "Error",
        description: "Failed to save protein to database.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddToComparison = () => {
    if (!proteinData) return

    // Check if protein is already in comparison
    const exists = comparisonProteins.some((p) => p.sequence === proteinData.sequence)

    if (!exists) {
      setComparisonProteins((prev) => [...prev, proteinData])
      toast({
        title: "Added to Comparison",
        description: `${proteinName} has been added to the comparison list.`,
      })
    } else {
      toast({
        title: "Already Added",
        description: "This protein is already in the comparison list.",
        variant: "destructive",
      })
    }
  }

  const handleOptimizationComplete = (optimizedDirections: string[], energy: number) => {
    setDirections(optimizedDirections.join("-"))
    setProteinData((prev) => {
      if (!prev) return null
      return {
        ...prev,
        directions: optimizedDirections as Direction[],
      }
    })

    toast({
      title: "Optimization Complete",
      description: `Optimized structure with energy: ${energy}`,
    })
  }

  const handleSaveExport = async (exportType: string, fileName: string) => {
    if (!proteinData) return

    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 1, // In a real app, this would be the authenticated user's ID
          proteinId: proteinData.id || 0,
          exportType,
          filePath: fileName,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save export record")
      }
    } catch (error) {
      console.error("Error saving export record:", error)
    }
  }

  const handleSaveComparison = async (name: string, description: string) => {
    if (comparisonProteins.length < 2) return

    try {
      const response = await fetch("/api/comparisons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 1, // In a real app, this would be the authenticated user's ID
          name,
          description,
          proteinIds: comparisonProteins.map((p) => p.id).filter(Boolean),
        }),
      })

      if (response.ok) {
        toast({
          title: "Comparison Saved",
          description: `${name} has been saved to the database.`,
        })
      } else {
        throw new Error("Failed to save comparison")
      }
    } catch (error) {
      console.error("Error saving comparison:", error)
      toast({
        title: "Error",
        description: "Failed to save comparison to database.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
      <header className="flex flex-col md:flex-row justify-between items-center pb-4 border-b">
        <h1 className="text-2xl md:text-3xl font-bold text-indigo-800">HP Protein Visualizer</h1>
        <div className="flex gap-2 mt-2 md:mt-0">
          <Button variant="outline" className="text-indigo-800 border-indigo-800">
            Documentation
          </Button>
          <Button variant="outline" className="text-indigo-800 border-indigo-800">
            About
          </Button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="space-y-6">
          <Card className="bg-white shadow-lg p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-semibold text-indigo-700">Input Protein Sequence</h2>
            <form className="mt-4 space-y-4" onSubmit={handleVisualize}>
              <div>
                <Label htmlFor="protein-name" className="text-gray-700">
                  Protein Name
                </Label>
                <Input
                  id="protein-name"
                  placeholder="e.g., My Protein"
                  value={proteinName}
                  onChange={(e) => setProteinName(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="protein-sequence" className="text-gray-700">
                  Protein Sequence (H = hydrophobic, P = polar)
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="protein-sequence"
                    placeholder="e.g., HHPHPH"
                    value={sequence}
                    onChange={(e) => setSequence(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={handleRandomSequence} className="whitespace-nowrap">
                    Random
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="folding-direction" className="text-gray-700">
                  Folding Directions (Optional)
                </Label>
                <Input
                  id="folding-direction"
                  placeholder="e.g., left-right-up-down"
                  className="mt-2"
                  value={directions}
                  onChange={(e) => setDirections(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate directions with hyphens. Leave empty for automatic folding.
                </p>
              </div>

              <div>
                <Label htmlFor="visualization-type" className="text-gray-700">
                  Visualization Type
                </Label>
                <Select value={visualizationType} onValueChange={(value: any) => setVisualizationType(value)}>
                  <SelectTrigger id="visualization-type" className="mt-2">
                    <SelectValue placeholder="Select visualization type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2d">2D Model</SelectItem>
                    <SelectItem value="3d">3D Model</SelectItem>
                    <SelectItem value="ribbon">Ribbon</SelectItem>
                    <SelectItem value="space-filling">Space Filling</SelectItem>
                    <SelectItem value="stick">Stick Model</SelectItem>
                    <SelectItem value="surface">Surface</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && <div className="text-red-500 text-sm p-2 bg-red-50 rounded-md">{error}</div>}

              <div className="flex gap-2">
                <Button type="submit" className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700">
                  Visualize
                </Button>
                <Button type="button" variant="outline" onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </form>
          </Card>

          {proteinData && (
            <Card className="bg-white shadow-lg p-4 md:p-6">
              <h2 className="text-xl font-semibold text-indigo-700 mb-4">Protein Analysis</h2>
              <ProteinAnalysis proteinData={proteinData} />
            </Card>
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Database className="w-4 h-4 mr-2" /> Browse Saved Proteins
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Saved Proteins</DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-2 text-left">Name</th>
                      <th className="border p-2 text-left">Sequence</th>
                      <th className="border p-2 text-left">Length</th>
                      <th className="border p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedProteins.length > 0 ? (
                      savedProteins.map((protein, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                          <td className="border p-2">{protein.name}</td>
                          <td className="border p-2 font-mono">{protein.sequence}</td>
                          <td className="border p-2">{protein.sequence.length}</td>
                          <td className="border p-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSequence(protein.sequence)
                                  setProteinName(protein.name || "Loaded Protein")
                                  setDirections(protein.directions?.join("-") || "")
                                }}
                              >
                                Load
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setComparisonProteins((prev) => {
                                    if (prev.some((p) => p.id === protein.id)) return prev
                                    return [...prev, protein]
                                  })
                                }}
                              >
                                Compare
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="border p-4 text-center text-gray-500">
                          No saved proteins found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          <Card className="bg-white shadow-lg p-4 h-[500px] flex flex-col">
            <Tabs defaultValue="visualization" className="w-full h-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="visualization">
                  <Layers className="w-4 h-4 mr-2" />
                  Visualization
                </TabsTrigger>
                <TabsTrigger value="energy">
                  <BarChart2 className="w-4 h-4 mr-2" />
                  Energy
                </TabsTrigger>
                <TabsTrigger value="comparison">
                  <Share2 className="w-4 h-4 mr-2" />
                  Comparison
                </TabsTrigger>
                <TabsTrigger value="export">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </TabsTrigger>
              </TabsList>

              <TabsContent value="visualization" className="flex-1">
                {proteinData ? (
                  <div className="w-full h-full bg-gray-50 rounded-md overflow-hidden">
                    <Canvas>
                      <ambientLight intensity={0.5} />
                      <directionalLight position={[10, 10, 10]} intensity={1} />
                      <PerspectiveCamera makeDefault position={[0, 0, 15]} />
                      <OrbitControls enablePan enableZoom enableRotate />
                      <ProteinModel
                        sequence={proteinData.sequence}
                        directions={proteinData.directions}
                        visualizationType={visualizationType}
                      />
                    </Canvas>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-md">
                    <p className="text-gray-400">Enter a protein sequence and click Visualize</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="energy" className="flex-1 overflow-y-auto">
                {proteinData ? (
                  <EnergyMinimization
                    sequence={proteinData.sequence}
                    initialDirections={proteinData.directions?.map((d) => d as string)}
                    onOptimizationComplete={handleOptimizationComplete}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-md">
                    <p className="text-gray-400">Enter a protein sequence and click Visualize</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comparison" className="flex-1 overflow-y-auto">
                <ProteinComparison proteins={comparisonProteins} onSaveComparison={handleSaveComparison} />
              </TabsContent>

              <TabsContent value="export" className="flex-1 overflow-y-auto">
                {proteinData ? (
                  <ExportOptions
                    sequence={proteinData.sequence}
                    directions={proteinData.directions?.map((d) => d as string)}
                    proteinName={proteinName}
                    onSaveExport={handleSaveExport}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-md">
                    <p className="text-gray-400">Enter a protein sequence and click Visualize</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {proteinData && (
            <Card className="bg-white shadow-lg p-4 md:p-6">
              <h2 className="text-xl font-semibold text-indigo-700 mb-2">Actions</h2>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleSaveProtein} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Save to Database
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleAddToComparison}>
                  <Share2 className="w-4 h-4 mr-2" /> Add to Comparison
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>

      <footer className="mt-12 text-center text-sm text-gray-500">
        <Separator className="my-4" />
        <p>&copy; 2025 HP Protein Visualizer. Built for learning and exploration.</p>
      </footer>
    </div>
  )
}

export default ProteinVisualizer
