"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WatchItemFormDialog } from "./watch-item-form-dialog";

export function NewWatchItemButton() {
  const router = useRouter();
  return (
    <WatchItemFormDialog
      onCreated={(id) => router.push(`/watch/${id}`)}
      trigger={
        <Button>
          <Plus aria-hidden /> Add watch item
        </Button>
      }
    />
  );
}
