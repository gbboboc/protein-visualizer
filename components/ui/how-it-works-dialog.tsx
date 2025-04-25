"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function HowItWorksDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="link"
          className="text-sm font-medium transition-colors hover:text-primary"
        >
          How It Works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-4">
            How HP Protein Visualizer Works
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-2">The HP Model</h3>
            <DialogDescription>
              The HP (Hydrophobic-Polar) model is a simplified representation of
              protein folding where amino acids are classified into two types:
            </DialogDescription>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>
                <span className="font-medium">H (Hydrophobic)</span>: Represents
                water-fearing amino acids
              </li>
              <li>
                <span className="font-medium">P (Polar)</span>: Represents
                water-loving amino acids
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">
              Visualization Features
            </h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>3D interactive model with different visualization styles</li>
              <li>Energy calculation based on hydrophobic interactions</li>
              <li>Automatic folding direction generation</li>
              <li>Protein comparison tools</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">Using the Visualizer</h3>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Enter a sequence of H's and P's representing your protein</li>
              <li>
                Optionally specify folding directions (left-right-up-down)
              </li>
              <li>Choose a visualization style</li>
              <li>Analyze energy and compare with other proteins</li>
            </ol>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
