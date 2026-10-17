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

export const PART_STATUS_LABELS = {
  idea: "Idea",
  researching: "Researching",
  wishlist: "Wishlist",
  ordered: "Ordered",
  received: "Received",
  installed: "Installed",
  removed: "Removed",
  sold: "Sold",
  returned: "Returned",
} as const;

export const PART_CATEGORY_LABELS = {
  suspension: "Suspension",
  armor: "Armor",
  lighting: "Lighting",
  recovery: "Recovery",
  electrical: "Electrical",
  tires_wheels: "Tires/wheels",
  interior: "Interior",
  trim: "Trim",
  fluids: "Fluids",
  other: "Other",
} as const;

export const TOOL_STATUS_LABELS = {
  owned: "Owned",
  borrowed: "Borrowed",
  rented: "Rented",
  need_to_buy: "Need to buy",
} as const;

export const EXPENSE_CATEGORY_LABELS = {
  part: "Part",
  tool: "Tool",
  shop_labor_bay: "Shop labor or bay rental",
  shipping_tax_fees: "Shipping/tax/fees",
  fluids_consumables: "Fluids & consumables",
  other: "Other",
  sale: "Sale",
} as const;

export const EXPENSE_STATE_LABELS = {
  committed: "Committed",
  paid: "Paid",
} as const;

export const WATCH_SYSTEM_LABELS = {
  engine: "Engine",
  drivetrain: "Drivetrain",
  suspension: "Suspension",
  steering: "Steering",
  brakes: "Brakes",
  electrical: "Electrical",
  body: "Body",
  other: "Other",
} as const;

export const WATCH_SEVERITY_LABELS = {
  monitor: "Monitor",
  concerning: "Concerning",
  act_soon: "Act soon",
} as const;

export const WATCH_STATUS_LABELS = {
  watching: "Watching",
  promoted: "Promoted",
  resolved: "Resolved",
  dismissed: "Dismissed",
} as const;
