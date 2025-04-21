"use client";

import { useEffect } from "react";

export function BrowserAttributes() {
  useEffect(() => {
    // Add any browser-specific attributes here
    document.body.setAttribute("br-mode", "off");
    document.body.setAttribute("saccades-color", "");
    document.body.setAttribute("fixation-strength", "2");
    document.body.setAttribute("saccades-interval", "0");
    document.body.style.setProperty("--fixation-edge-opacity", "80%");
    document.body.style.setProperty("--br-line-height", "1");
    document.body.style.setProperty("--br-boldness", "600");

    // Cleanup function
    return () => {
      document.body.removeAttribute("br-mode");
      document.body.removeAttribute("saccades-color");
      document.body.removeAttribute("fixation-strength");
      document.body.removeAttribute("saccades-interval");
      document.body.style.removeProperty("--fixation-edge-opacity");
      document.body.style.removeProperty("--br-line-height");
      document.body.style.removeProperty("--br-boldness");
    };
  }, []);

  return null;
}
