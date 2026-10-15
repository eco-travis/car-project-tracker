"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { deletePart } from "@/lib/actions/parts";

/**
 * Delete a part, with a confirmation that says what happens to linked records.
 * `icon` for table rows; `text` on the part page (which then returns to the Parts list).
 */
export function DeletePartButton({
  id,
  title,
  variant = "icon",
  redirectTo,
}: {
  id: string;
  title: string;
  variant?: "icon" | "text";
  redirectTo?: string;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      title="Delete part"
      description={
        <>
          Delete &ldquo;{title}&rdquo;? Expenses linked to it stay in the
          ledger, unlinked. Its photos and files are deleted, and links from
          tasks, watch items, and replaced parts are removed. This can&apos;t be
          undone.
        </>
      }
      confirmLabel="Delete part"
      onConfirm={async () => {
        const result = await deletePart(id);
        if (result.ok && redirectTo) router.push(redirectTo);
        return result;
      }}
      trigger={
        variant === "icon" ? (
          <Button variant="ghost" size="icon-xs" aria-label={`Delete ${title}`}>
            <Trash2 aria-hidden />
          </Button>
        ) : (
          <Button variant="ghost">Delete</Button>
        )
      }
    />
  );
}
