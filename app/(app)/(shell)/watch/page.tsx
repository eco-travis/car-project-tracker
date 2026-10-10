import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Watch list" };

export default function WatchlistPage() {
  return (
    <>
      <PageHeader
        title="Watch list"
        description="What am I keeping an eye on, and what's due?"
      />
      <ComingSoon milestone="M5" />
    </>
  );
}
