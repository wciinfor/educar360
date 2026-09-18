"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ChevronDown,
  LogOut,
  User,
  Sparkles,
} from "lucide-react";

interface PlatformHeaderProps {
  userEmail: string;
  userName: string;
}

export function PlatformHeader({ userEmail, userName }: PlatformHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Sparkles className="w-3.5 h-3.5" />
          Plataforma Multi-Tenant Ativa
        </span>
      </div>

      {/* User profile & Actions */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-700"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {userName ? userName[0].toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-zinc-900 leading-tight">
                {userName}
              </div>
              <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                <ShieldAlert className="w-3 h-3" />
                Super Administrador
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-zinc-200 py-1 z-30">
              <div className="px-4 py-2 border-b border-zinc-100">
                <div className="text-xs font-semibold text-zinc-900">{userName}</div>
                <div className="text-[11px] text-zinc-500 truncate">{userEmail}</div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair do Backoffice
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
