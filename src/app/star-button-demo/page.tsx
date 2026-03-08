"use client";

import { StarButton } from "@/components/ui/star-button";

export default function StarButtonDemo() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-4 bg-background">
      <StarButton lightColor="#FAFAFA" className="rounded-3xl">
        Get Started
      </StarButton>
      <StarButton lightColor="#FF2056" className="rounded-3xl">
        Learn More
      </StarButton>
    </div>
  );
}
