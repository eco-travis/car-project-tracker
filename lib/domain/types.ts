import type { Database } from "@/lib/db/types";

type Enums = Database["public"]["Enums"];
export type JobStatus = Enums["job_status"];
export type JobType = Enums["job_type"];
export type PhaseStatus = Enums["phase_status"];
export type PerformedBy = Enums["performed_by"];
export type PartStatus = Enums["part_status"];
export type TaskStatus = Enums["task_status"];
