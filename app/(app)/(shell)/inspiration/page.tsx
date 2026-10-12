import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { InspirationBoard } from "@/components/inspiration/inspiration-board";
import { InspirationFormDialog } from "@/components/inspiration/inspiration-form-dialog";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInspirations } from "@/lib/db/queries/inspiration";
import { getPhaseOptions } from "@/lib/db/queries/plan";
import { allTags, matchesTag } from "@/lib/domain/inspiration";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Inspiration" };

export default async function InspirationPage({
  searchParams,
}: PageProps<"/inspiration">) {
  const { tag: rawTag } = await searchParams;
  const tag =
    (Array.isArray(rawTag) ? rawTag[0] : rawTag)?.toLowerCase() || undefined;
  const [cards, phases] = await Promise.all([
    getInspirations(),
    getPhaseOptions(),
  ]);
  const tags = allTags(cards);
  const shown = cards.filter((c) => matchesTag(c, tag));

  return (
    <>
      <PageHeader
        title="Inspiration"
        description="Ideas board."
        actions={
          <InspirationFormDialog
            trigger={
              <Button>
                <Plus aria-hidden /> Add idea
              </Button>
            }
          />
        }
      />
      {tags.length > 0 && (
        <nav aria-label="Filter by tag" className="mb-4 flex flex-wrap gap-2">
          <Link href="/inspiration" aria-current={!tag ? "page" : undefined}>
            <Badge variant={!tag ? "default" : "outline"}>All</Badge>
          </Link>
          {tags.map((t) => (
            <Link
              key={t}
              href={`/inspiration?tag=${encodeURIComponent(t)}`}
              aria-current={tag === t ? "page" : undefined}
            >
              <Badge
                variant={tag === t ? "default" : "outline"}
                className={cn(tag === t && "font-semibold")}
              >
                {t}
              </Badge>
            </Link>
          ))}
        </nav>
      )}
      {shown.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          {tag
            ? `No ideas tagged “${tag}”.`
            : "No ideas yet. Save a forum thread, a photo, or a vendor page."}
        </p>
      ) : (
        <InspirationBoard cards={shown} phases={phases} />
      )}
    </>
  );
}
