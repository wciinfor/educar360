"use client";

import React, { useState } from "react";
import { PlatformSidebar } from "./PlatformSidebar";
import { PlatformHeader } from "./PlatformHeader";

interface PlatformAdminShellProps {
  userEmail: string;
  userName: string;
  children: React.ReactNode;
}

export function PlatformAdminShell({
  userEmail,
  userName,
  children,
}: PlatformAdminShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 overflow-hidden font-sans">
      <PlatformSidebar
        mobileOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PlatformHeader
          userEmail={userEmail}
          userName={userName}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-100/60 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
