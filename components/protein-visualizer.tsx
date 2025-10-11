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
import { OrbitControls, OrthographicCamera } from "@react-three/drei";
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
import ProteinSolver from "@/components/protein-solver-refactored";
import ExportOptions from "@/components/export-options";
import { getPublicProteins, saveProtein } from "@/app/actions";
import { SavedContentDialog } from "./saved-content-dialog";
import { Direction } from "@/lib/types";
import { parseDirections, directionsToString } from "@/lib/utils";

export type VisualizationType =
  | "3d"
  | "2d"
  | "ribbon"
  | "space-filling"
  | "surface";

export type ProteinSequence = {
  id?: number;
  _id?: string | unknown;
  name?: string;
  sequence: string;
  directions?: Direction[];
  userId?: string | unknown;
  description?: string;
  isPublic?: boolean | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

const ProteinVisualizer = () => {
  const [sequence, setSequence] = useState<string>("");
  const [directions, setDirections] = useState<string>("");
  const [directionsError, setDirectionsError] = useState<string>("");
  const [proteinName, setProteinName] = useState<string>("");
  const [proteinNameError, setProteinNameError] = useState<string>("");
  const [proteinData, setProteinData] = useState<ProteinSequence | null>(null);
  const [visualizationType, setVisualizationType] =
    useState<VisualizationType>("3d");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [savedProteins, setSavedProteins] = useState<ProteinSequence[]>([]);
  const [savedComparisons, setSavedComparisons] = useState<any[]>([]);
  const [comparisonProteins, setComparisonProteins] = useState<
    ProteinSequence[]
  >([]);
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [comparisonSaved, setComparisonSaved] = useState(false);

  // Load saved proteins and comparisons from database on initial render
  useEffect(() => {
    const fetchSavedContent = async () => {
      try {
        // Fetch proteins
        const { data: proteinsData, error: proteinsError } =
          await getPublicProteins();
        if (proteinsError) {
          throw new Error(proteinsError);
        }
        if (proteinsData) {
          const convertedData = proteinsData.map((protein) => ({
            ...protein,
            directions:
              protein.directions && Array.isArray(protein.directions)
                ? (protein.directions as Direction[])
                : protein.directions && typeof protein.directions === "string"
                ? parseDirections(protein.directions)
                : undefined,
          }));
          setSavedProteins(convertedData);
        }

        // Fetch comparisons
        if (session?.user?.id) {
          const response = await fetch(
            `/api/comparisons?userId=${session.user.id}`
          );
          if (!response.ok) throw new Error("Failed to fetch comparisons");
          const comparisonsData = await response.json();
          setSavedComparisons(comparisonsData);
        }
      } catch (error) {
        console.error("Error fetching saved content:", error);
        toast({
          title: "Error",
          description: "Failed to fetch saved content.",
          variant: "destructive",
        });
      }
    };

    fetchSavedContent();
  }, [toast, session?.user?.id]);

  const handleVisualize = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Visualizing protein with sequence:", sequence);

    if (!sequence) {
      setError("Please enter a protein sequence");
      return;
    }

    // Validate directions if provided
    if (directions) {
      const parsedDirections = parseDirections(directions);
      if (parsedDirections.length === 0) {
        setError(
          "Invalid direction format. Please use only letters R (Right), U (Up), D (Down), L (Left). Example: RUDL or R U D L"
        );
        return;
      }
    }

    const newProteinData: ProteinSequence = {
      sequence,
      directions: directions ? parseDirections(directions) : undefined,
      name: proteinName,
    };

    console.log("Created new protein data:", newProteinData);
    setProteinData(newProteinData);
    setError(null);
  };

  const handleDirectionsChange = (value: string) => {
    setDirections(value);

    // Clear error if input is empty
    if (!value.trim()) {
      setDirectionsError("");
      return;
    }

    // Validate directions in real-time
    const parsedDirections = parseDirections(value);
    if (parsedDirections.length === 0) {
      setDirectionsError("Invalid format. Use only letters R, U, D, L");
    } else {
      setDirectionsError("");
    }
  };

  const handleReset = () => {
    setSequence("");
    setDirections("");
    setDirectionsError("");
    setProteinName("");
    setProteinNameError("");
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

    if (!proteinName.trim()) {
      setProteinNameError("Please provide a name for the protein");
      return;
    }

    setProteinNameError("");
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
    console.log("Adding protein to comparison:", protein);
    if (!protein) {
      console.log("No protein provided");
      return;
    }

    // Ensure directions is an array
    const proteinWithDirections = {
      ...protein,
      directions: Array.isArray(protein.directions) ? protein.directions : [],
    };

    // Check if protein is already in comparison
    const exists = comparisonProteins.some(
      (p) => p.sequence === protein.sequence
    );

    console.log("Protein exists in comparison:", exists);
    console.log("Current comparison proteins:", comparisonProteins);

    if (!exists) {
      setComparisonProteins((prev) => {
        console.log("Adding protein to comparison list");
        return [...prev, proteinWithDirections];
      });
      toast({
        title: "Added to Comparison",
        description: `${
          protein.name || "Protein"
        } has been added to the comparison list.`,
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
    optimizedDirections: Direction[],
    energy: number
  ) => {
    setDirections(directionsToString(optimizedDirections));
    setProteinData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        directions: optimizedDirections,
      };
    });

    toast({
      title: "Solver Complete",
      description: `Found conformation with energy: ${energy}`,
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
    console.log("handleSaveComparison called");
    console.log("Current comparison proteins:", comparisonProteins);

    if (!session?.user?.id) {
      console.log("No user session found");
      toast({
        title: "Authentication required",
        description: "Please sign in to save comparisons",
        variant: "destructive",
      });
      return;
    }

    if (comparisonProteins.length < 2) {
      console.log(
        "Not enough proteins for comparison:",
        comparisonProteins.length
      );
      toast({
        title: "Error",
        description: "You need at least 2 proteins to create a comparison",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Attempting to save comparison...");

      // First, ensure all proteins are saved to the database
      const savedProteins = await Promise.all(
        comparisonProteins.map(async (protein) => {
          if (!protein._id && !protein.id) {
            // Save the protein if it doesn't have an ID
            const response = await fetch("/api/proteins", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: protein.name || "Unnamed Protein",
                sequence: protein.sequence,
                directions: protein.directions,
                isPublic: true,
                userId: session.user.id,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to save protein");
            }

            const savedProtein = await response.json();
            return savedProtein;
          }
          return protein;
        })
      );

      // Extract protein IDs from saved proteins
      const proteinIds = savedProteins.map((p) => {
        const id = p._id || p.id;
        if (!id) {
          throw new Error("Protein missing ID after saving");
        }
        return id;
      });

      console.log("Saving comparison with protein IDs:", proteinIds);

      const response = await fetch("/api/comparisons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Comparison of ${comparisonProteins.length} proteins`,
          description: `Comparison created on ${new Date().toLocaleDateString()}`,
          proteinIds: proteinIds,
          userId: session.user.id,
        }),
      });

      console.log("Save comparison response:", response);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to save comparison:", errorData);
        throw new Error("Failed to save comparison");
      }

      const data = await response.json();
      console.log("Comparison saved successfully:", data);

      toast({
        title: "Comparison Saved",
        description: "Your comparison has been saved successfully.",
      });
      setComparisonProteins([]);
      setComparisonSaved((prev) => !prev); // Toggle to trigger refresh
    } catch (error) {
      console.error("Error saving comparison:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to save comparison to database.",
        variant: "destructive",
      });
    }
  };

  const handleLoadProtein = (protein: ProteinSequence) => {
    setSequence(protein.sequence);
    setProteinName(protein.name || "Loaded Protein");
    setDirections(
      protein.directions ? directionsToString(protein.directions) : ""
    );
    setDirectionsError(""); // Clear any directions error when loading
  };

  const handleLoadComparison = (proteins: ProteinSequence[]) => {
    setComparisonProteins(proteins);
  };

  return (
    <div className="min-h-screen bg-background px-6 py-6">
      <div className="mx-auto max-w-[1800px] space-y-6">
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
                    onChange={(e) => {
                      setProteinName(e.target.value);
                      setProteinNameError("");
                    }}
                    placeholder="Enter protein name"
                    className={proteinNameError ? "border-red-500" : ""}
                  />
                  {proteinNameError && (
                    <p className="text-sm text-red-500 mt-1">
                      {proteinNameError}
                    </p>
                  )}
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
                    onChange={(e) => handleDirectionsChange(e.target.value)}
                    placeholder="e.g., RUDL or R U D L"
                    className={directionsError ? "border-red-500" : ""}
                  />
                  {directionsError ? (
                    <p className="text-sm text-red-500">{directionsError}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Use letters R (Right), U (Up), D (Down), L (Left).
                    </p>
                  )}
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
                  Solver
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
                      <Canvas style={{ width: "100%", height: "100%" }}>
                        <OrthographicCamera
                          makeDefault
                          position={
                            visualizationType === "2d" ? [0, 0, 20] : [0, 0, 10]
                          }
                          near={0.1}
                          far={1000}
                          zoom={visualizationType === "2d" ? 60 : 50}
                        />
                        <OrbitControls
                          enableRotate={visualizationType !== "2d"}
                          enablePan
                          enableZoom
                          screenSpacePanning
                          target={[0, 0, 0]}
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
                    <Canvas style={{ width: "100%", height: "100%" }}>
                      <OrthographicCamera
                        makeDefault
                        position={
                          visualizationType === "2d" ? [0, 0, 20] : [0, 0, 10]
                        }
                        near={0.1}
                        far={1000}
                        zoom={visualizationType === "2d" ? 60 : 50}
                      />
                      <OrbitControls
                        enableRotate={visualizationType !== "2d"}
                        enablePan
                        enableZoom
                        screenSpacePanning
                        target={[0, 0, 0]}
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
                <ProteinSolver
                  sequence={proteinData?.sequence || ""}
                  initialDirections={proteinData?.directions}
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
                {proteinData ? (
                  <ExportOptions
                    sequence={proteinData.sequence}
                    directions={proteinData.directions}
                    proteinName={proteinData.name}
                    onExport={handleSaveExport}
                  />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center justify-center space-y-4 py-8">
                        <p className="text-gray-600 text-center">
                          Please provide a protein sequence to export.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SavedContentDialog
            onLoadProtein={handleLoadProtein}
            onAddToComparison={handleAddToComparison}
            onLoadComparison={handleLoadComparison}
            onComparisonSaved={() => setComparisonSaved((prev) => !prev)}
          />

          {/* Actions Card */}
          {proteinData && (
            <Card className="p-4">
              <h2 className="text-lg font-semibold text-primary mb-4">
                Actions
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveProtein}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Save to Database
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log("Add to Comparison button clicked");
                    console.log("Current proteinData:", proteinData);
                    handleAddToComparison(proteinData);
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" /> Add to Comparison
                </Button>
                {comparisonProteins.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleSaveComparison}
                    className="col-span-2"
                  >
                    <Save className="w-4 h-4 mr-2" /> Save Comparison
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProteinVisualizer;
