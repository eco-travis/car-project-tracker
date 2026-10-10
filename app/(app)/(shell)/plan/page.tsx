import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { PhaseFormDialog } from "@/components/plan/phase-form-dialog";
import { PlanBoard } from "@/components/plan/plan-board";
import { Button } from "@/components/ui/button";
import { getPlan } from "@/lib/db/queries/plan";

export const metadata: Metadata = { title: "Plan" };

export default async function PlanPage() {
  const { phases, unphased } = await getPlan();
  return (
    <>
      <PageHeader
        title="Plan"
        description="What's next and what's blocking it?"
        actions={
          <PhaseFormDialog
            trigger={
              <Button>
                <Plus aria-hidden /> Add phase
              </Button>
            }
          />
        }
      />
      <PlanBoard phases={phases} unphased={unphased} />
    </>
  );
}
