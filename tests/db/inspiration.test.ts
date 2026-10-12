import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedPhaseNames } from "@/lib/domain/phases";
import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/local-supabase";

let user: TestUser;
let vehicleId: string;
let inspId: string;

beforeAll(async () => {
  user = await createTestUser("insp");
  const { data } = await user.client.rpc("create_vehicle_with_phases", {
    p_name: "Insp",
    p_phase_names: seedPhaseNames(),
  });
  vehicleId = data!;
  const { data: insp } = await user.client
    .from("inspirations")
    .insert({
      vehicle_id: vehicleId,
      title: "Roof rack",
      source_url: "https://example.com",
      tags: ["armor"],
    })
    .select("id")
    .single();
  inspId = insp!.id;
});

afterAll(async () => {
  if (user) await deleteTestUser(user);
});

describe("promote_inspiration_* (rule 19)", () => {
  it("creates a Wishlist part and links it", async () => {
    const { data: partId, error } = await user.client.rpc(
      "promote_inspiration_to_part",
      {
        p_inspiration_id: inspId,
        p_name: "Roof rack",
        p_product_url: "https://example.com",
      },
    );
    expect(error).toBeNull();
    const { data: part } = await user.client
      .from("parts")
      .select("name, status, product_url, vehicle_id")
      .eq("id", partId!)
      .single();
    expect(part).toEqual({
      name: "Roof rack",
      status: "wishlist",
      product_url: "https://example.com",
      vehicle_id: vehicleId,
    });
    const { data: insp } = await user.client
      .from("inspirations")
      .select("promoted_part_id")
      .eq("id", inspId)
      .single();
    expect(insp!.promoted_part_id).toBe(partId);
  });

  it("refuses to overwrite without confirmation, and overwrites with it", async () => {
    const { count: before } = await user.client
      .from("parts")
      .select("*", { count: "exact", head: true });
    const refused = await user.client.rpc("promote_inspiration_to_part", {
      p_inspiration_id: inspId,
      p_name: "Again",
    });
    expect(refused.error?.message).toMatch(/confirm/);
    const { count: same } = await user.client
      .from("parts")
      .select("*", { count: "exact", head: true });
    expect(same).toBe(before);

    const { data: newPart } = await user.client.rpc(
      "promote_inspiration_to_part",
      {
        p_inspiration_id: inspId,
        p_name: "Again",
        p_overwrite: true,
      },
    );
    const { data: insp } = await user.client
      .from("inspirations")
      .select("promoted_part_id")
      .eq("id", inspId)
      .single();
    expect(insp!.promoted_part_id).toBe(newPart);
  });

  it("creates a Not started job in the chosen phase and links it", async () => {
    const { data: phases } = await user.client
      .from("phases")
      .select("id")
      .order("sort_order");
    const { data: jobId, error } = await user.client.rpc(
      "promote_inspiration_to_job",
      {
        p_inspiration_id: inspId,
        p_title: "Install roof rack",
        p_type: "modification",
        p_phase_id: phases![3].id,
        p_links: ["https://example.com"],
      },
    );
    expect(error).toBeNull();
    const { data: job } = await user.client
      .from("jobs")
      .select("title, type, status, phase_id, links")
      .eq("id", jobId!)
      .single();
    expect(job).toEqual({
      title: "Install roof rack",
      type: "modification",
      status: "not_started",
      phase_id: phases![3].id,
      links: ["https://example.com"],
    });
    const { data: insp } = await user.client
      .from("inspirations")
      .select("promoted_job_id")
      .eq("id", inspId)
      .single();
    expect(insp!.promoted_job_id).toBe(jobId);
  });
});
