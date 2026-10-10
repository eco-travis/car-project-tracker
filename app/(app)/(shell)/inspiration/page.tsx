import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Inspiration" };

export default function InspirationPage() {
  return (
    <>
      <PageHeader title="Inspiration" description="Ideas board." />
      <ComingSoon milestone="M6" />
    </>
  );
}
