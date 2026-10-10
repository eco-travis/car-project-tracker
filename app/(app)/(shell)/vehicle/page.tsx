import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Vehicle" };

export default function VehiclePage() {
  return (
    <>
      <PageHeader
        title="Vehicle"
        description="Vehicle record and reference notes."
      />
      <ComingSoon milestone="M2" />
    </>
  );
}
