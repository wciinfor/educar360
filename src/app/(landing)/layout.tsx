import React from "react";
import Link from "next/link";
import { School, ShieldCheck } from "lucide-react";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      <main className="flex-1">{children}</main>
    </div>
  );
}
