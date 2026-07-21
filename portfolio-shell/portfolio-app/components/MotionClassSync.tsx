"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";

export default function MotionClassSync() {
  useEffect(() => {
    document.documentElement.classList.toggle(
      "motion-reduced",
      prefersReducedMotion()
    );
  }, []);

  return null;
}
