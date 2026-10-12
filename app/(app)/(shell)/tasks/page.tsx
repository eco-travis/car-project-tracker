import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskList } from "@/components/tasks/task-list";
import { Button } from "@/components/ui/button";
import { getTaskLinkOptions, getTasks } from "@/lib/db/queries/tasks";
import { todayIso } from "@/lib/domain/dates";
import { sortOpenTasks } from "@/lib/domain/tasks";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const [tasks, options] = await Promise.all([
    getTasks(),
    getTaskLinkOptions(),
  ]);
  const today = todayIso();
  const open = sortOpenTasks(tasks.filter((t) => t.status === "open"));
  const closed = tasks
    .filter((t) => t.status !== "open")
    .sort((a, b) => (b.completed_on ?? "").localeCompare(a.completed_on ?? ""))
    .slice(0, 30);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Tasks"
        description="What errands are open?"
        actions={
          <TaskFormDialog
            options={options}
            trigger={
              <Button>
                <Plus aria-hidden /> Add task
              </Button>
            }
          />
        }
      />
      <TaskList
        tasks={open}
        today={today}
        options={options}
        label="Open tasks"
        emptyText="No open tasks."
      />
      {closed.length > 0 && (
        <section aria-labelledby="closed-tasks">
          <h2
            id="closed-tasks"
            className="text-muted-foreground mb-2 text-sm font-semibold"
          >
            Done and dropped
          </h2>
          <TaskList
            tasks={closed}
            today={today}
            options={options}
            label="Done and dropped tasks"
          />
        </section>
      )}
    </div>
  );
}
