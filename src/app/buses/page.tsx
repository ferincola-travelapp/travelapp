import React, { Suspense } from "react";
import { fetchCmsData } from "@/lib/firestore-rest";
import BusesLandingClient from "./BusesLandingClient";

export const dynamic = "force-dynamic";

export default async function BusesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const rawBrand = Array.isArray(sp?.brand) ? sp.brand[0] : sp?.brand;
  const brand = (rawBrand || "ecosistema").toLowerCase();
  const docId =
    brand === "lunaviajera"
      ? "landing_lunaviajera"
      : brand === "experience"
      ? "landing_experience"
      : "landing_ecosistema";
  const initialCms = await fetchCmsData(docId);
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A2A5B]" />}>
      <BusesLandingClient initialCms={initialCms} />
    </Suspense>
  );
}
