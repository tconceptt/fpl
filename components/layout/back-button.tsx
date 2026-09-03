"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ href }: { href?: string }) {
  const router = useRouter();

  if (href) {
    return (
      <Button variant="ghost" size="icon" aria-label="Back" asChild>
        <Link href={href}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
    );
  }

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleClick} aria-label="Back">
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
