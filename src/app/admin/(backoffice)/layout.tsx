import React from "react";
import { redirect } from "next/navigation";
import { getPlatformAdminSession } from "@/lib/platform/resolver";
import { PlatformAdminShell } from "@/components/platform/PlatformAdminShell";

export default async function PlatformAdminSharedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPlatformAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <PlatformAdminShell
      userEmail={session.user.email}
      userName={session.profile.full_name}
    >
      {children}
    </PlatformAdminShell>
  );
}

