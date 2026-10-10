import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Job" };

export default function JobPage() {
  return (
    <>
      <PageHeader title="Job" description="Everything about one job." />
      <ComingSoon milestone="M2" />
    </>
  );
}
