"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from "lucide-react";
import { getPublicProteins } from "@/app/actions";
import type { ProteinSequence } from "./protein-visualizer";
import { Direction } from "@/lib/types";
import { parseDirections } from "@/lib/utils";

interface SavedContentDialogProps {
  onLoadProtein: (protein: ProteinSequence) => void;
  onAddToComparison: (protein: ProteinSequence) => void;
  onLoadComparison: (proteins: ProteinSequence[]) => void;
  onComparisonSaved?: () => void;
}

export function SavedContentDialog({
  onLoadProtein,
  onAddToComparison,
  onLoadComparison,
  onComparisonSaved,
}: SavedContentDialogProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [savedProteins, setSavedProteins] = useState<ProteinSequence[]>([]);
  const [savedComparisons, setSavedComparisons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSavedContent = async () => {
    try {
      setLoading(true);
      // Fetch proteins
      const { data: proteinsData, error: proteinsError } =
        await getPublicProteins();
      if (proteinsError) {
        throw new Error(proteinsError);
      }
      if (proteinsData) {
        setSavedProteins(
          proteinsData.map((protein) => ({
            ...protein,
            directions: protein.directions
              ? parseDirections(protein.directions)
              : undefined,
          }))
        );
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedContent();
  }, [toast, session?.user?.id]);

  // Add effect to refresh when a comparison is saved
  useEffect(() => {
    if (onComparisonSaved) {
      fetchSavedContent();
    }
  }, [onComparisonSaved]);

  const handleLoadComparison = async (comparison: any) => {
    try {
      setLoading(true);
      console.log("=== Starting to load comparison ===");
      console.log(
        "Full comparison object:",
        JSON.stringify(comparison, null, 2)
      );

      // If proteins are not populated, fetch them using proteinIds
      const proteinIds = Array.isArray(comparison.proteins)
        ? comparison.proteins
        : comparison.proteinIds
        ? Array.isArray(comparison.proteinIds)
          ? comparison.proteinIds
          : [comparison.proteinIds]
        : [];

      console.log("Protein IDs to fetch:", proteinIds);

      if (proteinIds.length === 0) {
        console.log("No protein IDs found in comparison");
        toast({
          title: "Error",
          description: "No proteins found in this comparison",
          variant: "destructive",
        });
        return;
      }

      // Fetch full protein data for each protein in the comparison
      console.log("Starting to fetch protein data...");
      const proteinsWithData = await Promise.all(
        proteinIds.map(async (proteinId: string) => {
          console.log(`Fetching protein with ID: ${proteinId}`);
          try {
            const response = await fetch(`/api/proteins?id=${proteinId}`);
            console.log(
              `Response status for protein ${proteinId}:`,
              response.status
            );

            if (!response.ok) {
              console.error(
                `Failed to fetch protein ${proteinId}:`,
                response.status,
                response.statusText
              );
              throw new Error(
                `Failed to fetch protein: ${response.statusText}`
              );
            }

            const data = await response.json();
            console.log(`Successfully fetched protein ${proteinId}:`, data);

            // Ensure the protein data has the required fields
            if (!data.sequence) {
              throw new Error(`Protein ${proteinId} is missing sequence data`);
            }

            return {
              ...data,
              directions: data.directions
                ? Array.isArray(data.directions)
                  ? data.directions
                  : parseDirections(data.directions)
                : undefined,
            };
          } catch (error) {
            console.error(`Error fetching protein ${proteinId}:`, error);
            throw error;
          }
        })
      );

      console.log("=== All proteins loaded successfully ===");
      console.log("Final proteins data:", proteinsWithData);

      // Verify all proteins have sequence data
      const invalidProteins = proteinsWithData.filter((p) => !p.sequence);
      if (invalidProteins.length > 0) {
        throw new Error(
          `Some proteins are missing sequence data: ${invalidProteins
            .map((p) => p._id || p.id)
            .join(", ")}`
        );
      }

      onLoadComparison(proteinsWithData);
    } catch (error) {
      console.error("=== Error in handleLoadComparison ===");
      console.error("Error details:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load comparison data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Database className="w-4 h-4 mr-2" /> Browse Saved Content
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Saved Content</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="proteins" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="proteins">Saved Proteins</TabsTrigger>
            <TabsTrigger value="comparisons">Saved Comparisons</TabsTrigger>
          </TabsList>
          <TabsContent value="proteins" className="mt-4">
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
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="border p-4 text-center">
                        Loading...
                      </td>
                    </tr>
                  ) : savedProteins.length > 0 ? (
                    savedProteins.map((protein, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-gray-50" : ""}
                      >
                        <td className="border p-2">{protein.name}</td>
                        <td className="border p-2 font-mono">
                          {protein.sequence}
                        </td>
                        <td className="border p-2">
                          {protein.sequence.length}
                        </td>
                        <td className="border p-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onLoadProtein(protein)}
                            >
                              Load
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onAddToComparison(protein)}
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
                        className="border p-4 text-center text-gray-500"
                      >
                        No saved proteins found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
          <TabsContent value="comparisons" className="mt-4">
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 text-left">Name</th>
                    <th className="border p-2 text-left">Proteins</th>
                    <th className="border p-2 text-left">Created</th>
                    <th className="border p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="border p-4 text-center">
                        Loading...
                      </td>
                    </tr>
                  ) : savedComparisons.length > 0 ? (
                    savedComparisons.map((comparison) => (
                      <tr key={comparison._id}>
                        <td className="border p-2">{comparison.name}</td>
                        <td className="border p-2">
                          {comparison.proteins.length}
                        </td>
                        <td className="border p-2">
                          {new Date(comparison.createdAt).toLocaleDateString()}
                        </td>
                        <td className="border p-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLoadComparison(comparison)}
                            >
                              Load
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="border p-4 text-center text-gray-500"
                      >
                        No saved comparisons found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
