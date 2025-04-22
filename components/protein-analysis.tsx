"use client";

import type React from "react";
import type { ProteinSequence } from "./protein-visualizer";
import { Progress } from "@/components/ui/progress";

interface ProteinAnalysisProps {
  proteinData: ProteinSequence;
}

const ProteinAnalysis: React.FC<ProteinAnalysisProps> = ({ proteinData }) => {
  const { sequence } = proteinData;

  // Calculate basic statistics
  const totalResidues = sequence.length;
  const hydrophobicCount = (sequence.match(/H/g) || []).length;
  const polarCount = (sequence.match(/P/g) || []).length;
  const hydrophobicPercentage = (hydrophobicCount / totalResidues) * 100;
  const polarPercentage = (polarCount / totalResidues) * 100;

  // Calculate hydrophobic interactions (simplified)
  // In a real application, this would be based on the actual 3D structure
  const calculateHydrophobicInteractions = () => {
    let count = 0;
    for (let i = 0; i < sequence.length - 1; i++) {
      if (sequence[i] === "H" && sequence[i + 1] === "H") {
        count++;
      }
    }
    return count;
  };

  const hydrophobicInteractions = calculateHydrophobicInteractions();

  // Calculate estimated energy (simplified HP model)
  // In the HP model, each H-H contact contributes -1 to the energy
  const estimatedEnergy = -hydrophobicInteractions;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-md">
          <h3 className="text-sm font-medium text-gray-700">Total Residues</h3>
          <p className="text-2xl font-bold text-indigo-700">{totalResidues}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <h3 className="text-sm font-medium text-gray-700">
            Estimated Energy
          </h3>
          <p className="text-2xl font-bold text-indigo-700">
            {estimatedEnergy}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">
              Hydrophobic (H)
            </span>
            <span className="text-sm font-medium text-gray-700">
              {hydrophobicCount} ({hydrophobicPercentage.toFixed(1)}%)
            </span>
          </div>
          <Progress
            value={hydrophobicPercentage}
            className="h-2 bg-gray-200 [&>div]:bg-red-500"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Polar (P)</span>
            <span className="text-sm font-medium text-gray-700">
              {polarCount} ({polarPercentage.toFixed(1)}%)
            </span>
          </div>
          <Progress
            value={polarPercentage}
            className="h-2 bg-gray-200 [&>div]:bg-blue-500"
          />
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Sequence Pattern
        </h3>
        <div className="flex flex-wrap gap-1">
          {sequence.split("").map((residue, index) => (
            <div
              key={index}
              className={`w-8 h-8 flex items-center justify-center rounded-md text-white font-medium ${
                residue === "H" ? "bg-red-500" : "bg-blue-500"
              }`}
            >
              {residue}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Hydrophobic Interactions
        </h3>
        <p className="text-sm text-gray-600">
          This protein has approximately {hydrophobicInteractions} hydrophobic
          interactions. In the HP model, hydrophobic interactions are the
          primary driving force for protein folding.
        </p>
      </div>
    </div>
  );
};

export default ProteinAnalysis;
