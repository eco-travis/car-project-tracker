import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage() {
  return (
    <>
      <PageHeader
        title="Plan"
        description="What's next and what's blocking it?"
      />
      <ComingSoon milestone="M2" />
    </>
  );
}
