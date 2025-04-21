"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
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

import ProteinModel from "@/components/protein-model";
import ProteinAnalysis from "@/components/protein-analysis";
import ProteinComparison from "@/components/protein-comparison";
import EnergyMinimization from "@/components/energy-minimization";
import ExportOptions from "@/components/export-options";
import { getPublicProteins, saveProtein } from "@/app/actions";

export type Direction = "left" | "right" | "up" | "down";
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
  const [visualizationType, setVisualizationType] = useState<
    "2d" | "3d" | "ribbon" | "space-filling" | "stick" | "surface"
  >("3d");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [savedProteins, setSavedProteins] = useState<ProteinSequence[]>([]);
  const [comparisonProteins, setComparisonProteins] = useState<
    ProteinSequence[]
  >([]);
  const { toast } = useToast();

  // Load saved proteins from database on initial render
  useEffect(() => {
    const fetchSavedProteins = async () => {
      try {
        const { data, error } = await getPublicProteins();
        if (error) {
          throw new Error(error);
        }
        if (data) {
          setSavedProteins(data);
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
    if (!proteinData) return;

    setLoading(true);
    try {
      const { data, error } = await saveProtein({
        userId: 1, // In a real app, this would be the authenticated user's ID
        name: proteinName,
        sequence: proteinData.sequence,
        description: `HP protein with ${proteinData.sequence.length} residues`,
        isPublic: true,
        directions: proteinData.directions
          ? proteinData.directions.join("-")
          : undefined,
      });

      if (error) {
        throw new Error(error);
      }

      if (data) {
        setSavedProteins((prev) => [...prev, data]);
        toast({
          title: "Protein Saved",
          description: `${proteinName} has been saved to the database.`,
        });
      }
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

  const handleAddToComparison = () => {
    if (!proteinData) return;

    // Check if protein is already in comparison
    const exists = comparisonProteins.some(
      (p) => p.sequence === proteinData.sequence
    );

    if (!exists) {
      setComparisonProteins((prev) => [...prev, proteinData]);
      toast({
        title: "Added to Comparison",
        description: `${proteinName} has been added to the comparison list.`,
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

  const handleSaveExport = async (exportType: string, fileName: string) => {
    if (!proteinData) return;

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
      });

      if (!response.ok) {
        throw new Error("Failed to save export record");
      }
    } catch (error) {
      console.error("Error saving export record:", error);
    }
  };

  const handleSaveComparison = async (name: string, description: string) => {
    if (comparisonProteins.length < 2) return;

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
      });

      if (response.ok) {
        toast({
          title: "Comparison Saved",
          description: `${name} has been saved to the database.`,
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
                    onValueChange={(value: any) => setVisualizationType(value)}
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
                      <SelectItem value="stick">Stick</SelectItem>
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
                      <ProteinModel
                        sequence={proteinData.sequence}
                        directions={proteinData.directions}
                        type={visualizationType}
                      />
                    </Canvas>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Enter a protein sequence and click Visualize
                  </div>
                )}
              </TabsContent>

              <TabsContent
                value="energy"
                className="mt-4 h-[500px] overflow-y-auto"
              >
                <EnergyMinimization
                  sequence={proteinData?.sequence || ""}
                  onOptimizationComplete={handleOptimizationComplete}
                />
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

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Browse Saved Proteins</h2>
          </div>
          <div className="overflow-x-auto">
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
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-gray-50" : ""}
                    >
                      <td className="border p-2">{protein.name}</td>
                      <td className="border p-2 font-mono">
                        {protein.sequence}
                      </td>
                      <td className="border p-2">{protein.sequence.length}</td>
                      <td className="border p-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setProteinName(protein.name || "");
                              setSequence(protein.sequence);
                              setDirections(
                                protein.directions?.join("-") || ""
                              );
                            }}
                          >
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddToComparison(protein)}
                          >
                            Compare
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="border p-4 text-center text-muted-foreground"
                    >
                      No saved proteins yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProteinVisualizer;
