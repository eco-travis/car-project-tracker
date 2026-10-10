import type {
  JobStatus,
  JobType,
  PerformedBy,
  PhaseStatus,
} from "@/lib/domain/types";

/** Display labels for enums, in the order the spec lists them. */
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  not_started: "Not started",
  waiting_on_parts: "Waiting on parts",
  ready: "Ready",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  maintenance: "Maintenance",
  repair: "Repair",
  modification: "Modification",
  diagnosis: "Diagnosis",
};

export const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  planned: "Planned",
  active: "Active",
  done: "Done",
};

export const PERFORMED_BY_LABELS: Record<PerformedBy, string> = {
  diy: "DIY",
  rented_bay: "Rented bay",
  shop: "Shop",
};

export function options<T extends string>(
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({
    value,
    label: labels[value],
  }));
}
