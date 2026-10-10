import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Tools" };

export default function ToolsPage() {
  return (
    <>
      <PageHeader
        title="Tools"
        description="What do I own and what do I need?"
      />
      <ComingSoon milestone="M3" />
    </>
  );
}
