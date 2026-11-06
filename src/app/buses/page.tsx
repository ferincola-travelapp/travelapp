import React, { Suspense } from "react";
import { fetchCmsData } from "@/lib/firestore-rest";
import BusesLandingClient from "./BusesLandingClient";

export const dynamic = "force-dynamic";

export default async function BusesPage() {
  const initialCms = await fetchCmsData("landing_buses");
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A2A5B]" />}>
      <BusesLandingClient initialCms={initialCms} />
    </Suspense>
  );
}
