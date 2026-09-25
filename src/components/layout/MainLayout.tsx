"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { TopNavbar } from "./TopNavbar";
import { Sidebar } from "./Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";

/**
 * Routes that should render WITHOUT the chrome (navbar + sidebar).
 * Add any future public/standalone pages here.
 */
const SHELL_FREE_ROUTES = ["/login"];

function AppShell({ 
  children, 
  isDashboard 
}: { 
  children: React.ReactNode; 
  isDashboard: boolean;
}) {
  const pathname = usePathname();
  const [isLandingHost, setIsLandingHost] = React.useState(!isDashboard);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      // El host pertenece al dashboard si contiene admin., localhost o 127.0.0.1
      const isDashboardHost = host.includes("admin.") || host.includes("localhost") || host.includes("127.0.0.1");
      setIsLandingHost(!isDashboardHost);
    }
  }, []);

  const hideShell =
    isLandingHost ||
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/marketplace" ||
    pathname.startsWith("/marketplace/") ||
    pathname === "/afiliados" ||
    pathname.startsWith("/afiliados/") ||
    pathname.startsWith("/checkout/") ||
    pathname.startsWith("/landing/") ||
    pathname === "/politica-de-cookies" ||
    pathname.startsWith("/politica-de-cookies");

  if (hideShell) {
    // Login (and other standalone pages) render without any chrome
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-tech-blue">
      <TopNavbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export const MainLayout = ({ 
  children, 
  isDashboard = true 
}: { 
  children: React.ReactNode; 
  isDashboard?: boolean;
}) => {
  return (
    <AuthProvider>
      <AppShell isDashboard={isDashboard}>{children}</AppShell>
    </AuthProvider>
  );
};
