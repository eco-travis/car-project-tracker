import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Gallery" };

export default function GalleryPage() {
  return (
    <>
      <PageHeader title="Gallery" description="How has the build progressed?" />
      <ComingSoon milestone="M4" />
    </>
  );
}
