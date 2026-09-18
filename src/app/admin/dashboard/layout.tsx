import React from "react";
import { redirect } from "next/navigation";
import { getPlatformAdminSession } from "@/lib/platform/resolver";
import { PlatformSidebar } from "@/components/platform/PlatformSidebar";
import { PlatformHeader } from "@/components/platform/PlatformHeader";

export default async function PlatformAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPlatformAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900 overflow-hidden font-sans">
      <PlatformSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PlatformHeader
          userEmail={session.user.email}
          userName={session.profile.full_name}
        />
        <main className="flex-1 overflow-y-auto p-6 bg-zinc-100/60">
          {children}
        </main>
      </div>
    </div>
  );
}
