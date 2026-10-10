import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Watch item" };

export default function WatchitemPage() {
  return (
    <>
      <PageHeader
        title="Watch item"
        description="Check-ins and follow-ups for one concern."
      />
      <ComingSoon milestone="M5" />
    </>
  );
}
