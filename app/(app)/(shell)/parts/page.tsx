import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Parts" };

export default function PartsPage() {
  return (
    <>
      <PageHeader
        title="Parts"
        description="What's on order, installed, or still an idea?"
      />
      <ComingSoon milestone="M3" />
    </>
  );
}
