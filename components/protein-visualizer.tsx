"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Save,
  Database,
  Download,
  Share2,
  BarChart2,
  Layers,
} from "lucide-react";
import { useSession } from "next-auth/react";

import ProteinModel from "@/components/protein-model";
import ProteinAnalysis from "@/components/protein-analysis";
import ProteinComparison from "@/components/protein-comparison";
import EnergyMinimization from "@/components/energy-minimization";
import ExportOptions from "@/components/export-options";
import { getPublicProteins, saveProtein } from "@/app/actions";

export type Direction = "left" | "right" | "up" | "down";

export type VisualizationType =
  | "3d"
  | "2d"
  | "ribbon"
  | "space-filling"
  | "surface";

export type ProteinSequence = {
  id?: number;
  name?: string;
  sequence: string;
  directions?: Direction[];
};

const ProteinVisualizer = () => {
  const [sequence, setSequence] = useState<string>("");
  const [directions, setDirections] = useState<string>("");
  const [proteinName, setProteinName] = useState<string>("My Protein");
  const [proteinData, setProteinData] = useState<ProteinSequence | null>(null);
  const [visualizationType, setVisualizationType] =
    useState<VisualizationType>("3d");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [savedProteins, setSavedProteins] = useState<ProteinSequence[]>([]);
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
  const [comparisonProteins, setComparisonProteins] = useState<
    ProteinSequence[]
  >([]);
  const { toast } = useToast();
  const { data: session } = useSession();

  // Load saved proteins from database on initial render
  useEffect(() => {
    const fetchSavedProteins = async () => {
      try {
        const { data, error } = await getPublicProteins();
        if (error) {
          throw new Error(error);
        }
        if (data) {
          const convertedData = data.map((protein) => ({
            ...protein,
            directions: protein.directions
              ? (protein.directions.split("-") as Direction[])
              : undefined,
          }));
          setSavedProteins(convertedData);
        }
      } catch (error) {
        console.error("Error fetching saved proteins:", error);
        toast({
          title: "Error",
          description: "Failed to fetch saved proteins.",
          variant: "destructive",
        });
      }
    };

    fetchSavedProteins();
  }, [toast]);

  const handleVisualize = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate sequence (should only contain H and P)
    if (!/^[HP]+$/i.test(sequence)) {
      setError(
        "Sequence must only contain H (hydrophobic) and P (polar) residues"
      );
      return;
    }

    // Parse directions if provided
    let parsedDirections: Direction[] | undefined = undefined;

    if (directions.trim()) {
      try {
        parsedDirections = directions.split("-").map((dir) => {
          const d = dir.trim().toLowerCase();
          if (!["left", "right", "up", "down"].includes(d)) {
            throw new Error(`Invalid direction: ${dir}`);
          }
          return d as Direction;
        });

        // Check if directions count is correct (should be sequence length - 1)
        if (parsedDirections.length !== sequence.length - 1) {
          setError(
            `Expected ${sequence.length - 1} directions, but got ${
              parsedDirections.length
            }`
          );
          return;
        }
      } catch (err) {
        setError((err as Error).message);
        return;
      }
    }

    setError(null);
    setProteinData({
      name: proteinName,
      sequence: sequence.toUpperCase(),
      directions: parsedDirections,
    });
  };

  const handleReset = () => {
    setSequence("");
    setDirections("");
    setProteinName("My Protein");
    setProteinData(null);
    setError(null);
  };

  const handleRandomSequence = () => {
    const length = Math.floor(Math.random() * 10) + 5; // Random length between 5-14
    let randomSeq = "";
    for (let i = 0; i < length; i++) {
      randomSeq += Math.random() > 0.5 ? "H" : "P";
    }
    setSequence(randomSeq);
  };

  const handleSaveProtein = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save proteins",
        variant: "destructive",
      });
      return;
    }

    if (!proteinData) return;

    setLoading(true);
    try {
      const response = await fetch("/api/proteins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: proteinName,
          sequence: proteinData.sequence,
          directions: proteinData.directions,
          isPublic: true,
          userId: session.user.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save protein to database");
      }

      const data = await response.json();
      setSavedProteins((prev) => [...prev, data]);
      toast({
        title: "Protein Saved",
        description: `${proteinName} has been saved to the database.`,
      });
    } catch (error) {
      console.error("Error saving protein:", error);
      toast({
        title: "Error",
        description: "Failed to save protein to database.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToComparison = (protein: ProteinSequence) => {
    if (!protein) return;

    // Check if protein is already in comparison
    const exists = comparisonProteins.some(
      (p) => p.sequence === protein.sequence
    );

    if (!exists) {
      setComparisonProteins((prev) => [...prev, protein]);
      toast({
        title: "Added to Comparison",
        description: `${protein.name} has been added to the comparison list.`,
      });
    } else {
      toast({
        title: "Already Added",
        description: "This protein is already in the comparison list.",
        variant: "destructive",
      });
    }
  };

  const handleOptimizationComplete = (
    optimizedDirections: string[],
    energy: number
  ) => {
    setDirections(optimizedDirections.join("-"));
    setProteinData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        directions: optimizedDirections as Direction[],
      };
    });

    toast({
      title: "Optimization Complete",
      description: `Optimized structure with energy: ${energy}`,
    });
  };

  const handleSaveExport = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save exports",
        variant: "destructive",
      });
      return;
    }

    if (!proteinData) return;

    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proteinId: proteinData.id,
          exportType: "pdb",
          userId: session.user.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save export record");
      }
    } catch (error) {
      console.error("Error saving export record:", error);
    }
  };

  const handleSaveComparison = async () => {
    if (!session?.user?.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save comparisons",
        variant: "destructive",
      });
      return;
    }

    if (comparisonProteins.length < 2) return;

    try {
      const response = await fetch("/api/comparisons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proteins: comparisonProteins,
          userId: session.user.id,
        }),
      });

      if (response.ok) {
        toast({
          title: "Comparison Saved",
          description: `${proteinName} has been saved to the database.`,
        });
      } else {
        throw new Error("Failed to save comparison");
      }
    } catch (error) {
      console.error("Error saving comparison:", error);
      toast({
        title: "Error",
        description: "Failed to save comparison to database.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-[1800px] space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">
            HP Protein Visualizer
          </h1>
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <a href="/documentation">Documentation</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/about">About</a>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">Input Protein Sequence</h2>
              <form onSubmit={handleVisualize} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="proteinName">Protein Name</Label>
                  <Input
                    id="proteinName"
                    value={proteinName}
                    onChange={(e) => setProteinName(e.target.value)}
                    placeholder="My Protein"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sequence">
                    Protein Sequence (H = hydrophobic, P = polar)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="sequence"
                      value={sequence}
                      onChange={(e) => setSequence(e.target.value)}
                      placeholder="e.g., HHPHPH"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRandomSequence}
                    >
                      Random
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="directions">
                    Folding Directions (Optional)
                  </Label>
                  <Input
                    id="directions"
                    value={directions}
                    onChange={(e) => setDirections(e.target.value)}
                    placeholder="e.g., left-right-up-down"
                  />
                  <p className="text-sm text-muted-foreground">
                    Separate directions with hyphens. Leave empty for automatic
                    folding.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visualizationType">Visualization Type</Label>
                  <Select
                    value={visualizationType}
                    onValueChange={(value: VisualizationType) =>
                      setVisualizationType(value)
                    }
                  >
                    <SelectTrigger id="visualizationType" className="w-full">
                      <SelectValue placeholder="Select visualization type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3d">3D Model</SelectItem>
                      <SelectItem value="2d">2D Model</SelectItem>
                      <SelectItem value="ribbon">Ribbon</SelectItem>
                      <SelectItem value="space-filling">
                        Space Filling
                      </SelectItem>
                      <SelectItem value="surface">Surface</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    Visualize
                  </Button>
                  <Button type="button" variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          <Card className="p-6">
            <Tabs defaultValue="visualization" className="h-full">
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

              <TabsContent value="visualization" className="mt-4 h-[500px]">
                {proteinData ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative w-full h-[500px] bg-gray-50 rounded-lg group">
                      <button
                        onClick={() => setIsCanvasFullscreen(true)}
                        className="absolute top-2 right-2 z-10 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                      </button>
                      <Canvas
                        camera={{ position: [5, 5, 10], fov: 50 }}
                        style={{ width: "100%", height: "100%" }}
                      >
                        <PerspectiveCamera makeDefault position={[5, 5, 10]} />
                        <OrbitControls
                          enableDamping
                          dampingFactor={0.1}
                          minDistance={2}
                          maxDistance={20}
                        />
                        <ambientLight intensity={0.8} />
                        <directionalLight
                          position={[10, 10, 10]}
                          intensity={1}
                        />
                        <directionalLight
                          position={[-10, -10, -10]}
                          intensity={0.5}
                        />
                        <ProteinModel
                          sequence={proteinData.sequence}
                          directions={proteinData.directions}
                          type={visualizationType}
                        />
                      </Canvas>
                    </div>
                    <div className="w-full h-[500px] overflow-y-auto">
                      <ProteinAnalysis proteinData={proteinData} />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Enter a protein sequence and click Visualize
                  </div>
                )}
              </TabsContent>

              {/* Fullscreen Canvas Dialog */}
              <Dialog
                open={isCanvasFullscreen}
                onOpenChange={setIsCanvasFullscreen}
              >
                <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh]">
                  <DialogHeader>
                    <DialogTitle>Protein Visualization</DialogTitle>
                  </DialogHeader>
                  <div className="w-full h-full bg-gray-50 rounded-lg">
                    <Canvas
                      camera={{ position: [5, 5, 10], fov: 50 }}
                      style={{ width: "100%", height: "100%" }}
                    >
                      <PerspectiveCamera makeDefault position={[5, 5, 10]} />
                      <OrbitControls
                        enableDamping
                        dampingFactor={0.1}
                        minDistance={2}
                        maxDistance={20}
                      />
                      <ambientLight intensity={0.8} />
                      <directionalLight position={[10, 10, 10]} intensity={1} />
                      <directionalLight
                        position={[-10, -10, -10]}
                        intensity={0.5}
                      />
                      {proteinData && (
                        <ProteinModel
                          sequence={proteinData.sequence}
                          directions={proteinData.directions}
                          type={visualizationType}
                        />
                      )}
                    </Canvas>
                  </div>
                </DialogContent>
              </Dialog>

              <TabsContent value="energy" className="space-y-4">
                {proteinData ? (
                  <EnergyMinimization
                    sequence={proteinData.sequence}
                    initialDirections={proteinData.directions}
                    onOptimizationComplete={handleOptimizationComplete}
                  />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center justify-center space-y-4 py-8">
                        <p className="text-gray-600 text-center">
                          Please provide a protein sequence to perform energy
                          minimization. The sequence should consist of H
                          (hydrophobic) and P (polar) residues.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent
                value="comparison"
                className="mt-4 h-[500px] overflow-y-auto"
              >
                <ProteinComparison proteins={comparisonProteins} />
              </TabsContent>

              <TabsContent
                value="export"
                className="mt-4 h-[500px] overflow-y-auto"
              >
                <ExportOptions onExport={handleSaveExport} />
              </TabsContent>
            </Tabs>
          </Card>
        </div>
        
        {/* Dialog Browse Saved Proteins */}
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
    </div>
  );
};

export default ProteinVisualizer;
