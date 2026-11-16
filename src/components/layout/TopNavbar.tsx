"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Globe, LogOut, User, ChevronDown, Home } from "lucide-react";
import { topNavTabs } from "@/lib/navigation";
import { NotificationsPopover } from "./NotificationsPopover";
import { useAuth } from "@/contexts/AuthContext";

export const TopNavbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to check if a tab is active based on current path
  const isTabActive = (href: string, tabId: string) => {
    if (tabId === "global") {
      return (
        pathname === "/" ||
        pathname.startsWith("/users") ||
        pathname.startsWith("/branches") ||
        pathname.startsWith("/messages") ||
        pathname.startsWith("/experiences/hotel-reception")
      );
    }
    if (tabId === "experiences") {
      return (
        pathname.startsWith("/experiences") &&
        !pathname.startsWith("/experiences/hotel-reception")
      );
    }
    if (href === "/" && pathname === "/") return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center">
          <img
            src="/assets/travelapp_original.svg"
            alt="TravelApp Ecosystem"
            className="h-8 w-auto"
          />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-tech-blue hover:bg-slate-100 transition-colors"
        >
          <Home className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Volver al Home</span>
        </Link>
      </div>

      <nav className="hidden flex-1 justify-center lg:flex">
        <ul className="flex items-center space-x-1 rounded-full bg-slate-50 p-1 border border-slate-200">
          {topNavTabs.map((tab) => {
            const active = isTabActive(tab.href, tab.id);
            let activeClass = "bg-tech-blue text-white";
            if (tab.id === "travelcab") {
              activeClass = "bg-[#FF7A00] text-white";
            } else if (tab.id === "experiences") {
              activeClass = "bg-[#EF4444] text-white";
            } else if (tab.id === "rewards") {
              activeClass = "bg-[#F59E0B] text-white";
            }

            if (tab.children && tab.children.length > 0) {
              const isOpen = openDropdownId === tab.id;
              return (
                <li
                  key={tab.id}
                  className="relative"
                  onMouseEnter={() => setOpenDropdownId(tab.id)}
                  onMouseLeave={() => setOpenDropdownId(null)}
                >
                  <Link
                    href={tab.href}
                    className={`flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? activeClass
                        : "text-slate-500 hover:text-tech-blue hover:bg-slate-100"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-150 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </Link>

                  {isOpen && (
                    <div className="absolute left-0 top-full pt-1.5 w-56 z-50">
                      <div className="rounded-2xl bg-white p-1.5 shadow-xl border border-slate-200 space-y-1">
                        {tab.children.map((sub) => (
                          <Link
                            key={sub.id}
                            href={sub.href}
                            onClick={() => setOpenDropdownId(null)}
                            className="block rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors"
                          >
                            <span className="block text-xs font-bold text-slate-900">
                              {sub.label}
                            </span>
                            {sub.subtitle && (
                              <span className="block text-[10px] text-slate-500">
                                {sub.subtitle}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            }

            return (
              <li key={tab.id}>
                <Link
                  href={tab.href}
                  className={`block rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? activeClass
                      : "text-slate-500 hover:text-tech-blue hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center space-x-3">
        <NotificationsPopover />

        {/* Language selector */}
        <div className="flex items-center space-x-2 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
          <Globe className="h-4 w-4" />
          <select className="bg-transparent text-sm font-medium outline-none text-tech-blue appearance-none cursor-pointer">
            <option value="es">ES</option>
            <option value="en">EN</option>
            <option value="pt">PT</option>
          </select>
        </div>

        {/* User info + logout */}
        {mounted && user ? (
          <div className="flex items-center gap-2">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-xs font-bold text-tech-blue leading-none">
                {user.displayName ?? user.email?.split("@")[0]}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                {user.role}
              </span>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-tech-blue/10 border border-tech-blue/20">
              <User className="h-5 w-5 text-tech-blue" />
            </div>
            <button
              id="logout-btn"
              onClick={handleLogout}
              title="Cerrar sesión"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-500 transition hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="h-9 w-9 overflow-hidden rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
            <User className="h-5 w-5 text-slate-400" />
          </div>
        )}
      </div>
    </header>
  );
};
