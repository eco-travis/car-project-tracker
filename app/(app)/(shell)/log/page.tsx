import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Work Log" };

export default function WorkLogPage() {
  return (
    <>
      <PageHeader
        title="Work Log"
        description="What has been done, when, at what mileage?"
      />
      <ComingSoon milestone="M2" />
    </>
  );
}
