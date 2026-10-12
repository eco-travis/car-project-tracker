"use client";

import { ClientTrigger } from "@/components/client-trigger";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PromoteForm } from "./promote-form";

export function PromoteDialog({
  item,
  phases,
  trigger,
}: {
  item: { id: string; title: string };
  phases: { id: string; name: string }[];
  trigger: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <ClientTrigger>{trigger}</ClientTrigger>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote to job</DialogTitle>
          <DialogDescription>{item.title}</DialogDescription>
        </DialogHeader>
        <PromoteForm itemId={item.id} itemTitle={item.title} phases={phases} />
      </DialogContent>
    </Dialog>
  );
}
