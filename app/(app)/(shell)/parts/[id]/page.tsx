import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Part" };

export default function PartPage() {
  return (
    <>
      <PageHeader
        title="Part"
        description="One part, from idea to installed."
      />
      <ComingSoon milestone="M3" />
    </>
  );
}
