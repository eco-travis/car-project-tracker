import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedPhaseNames } from "@/lib/domain/phases";
import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../support/local-supabase";

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("onboarding");
});

afterAll(async () => {
  if (user) await deleteTestUser(user);
});

describe("create_vehicle_with_phases (rule 21)", () => {
  it("creates the vehicle and the seeded phases in order", async () => {
    const { data: vehicleId, error } = await user.client.rpc(
      "create_vehicle_with_phases",
      {
        p_name: "2004 Cayenne Turbo",
        p_phase_names: seedPhaseNames(),
        p_year: 2004,
        p_current_odometer: 141250,
        p_purchase_price_cents: 1250000,
      },
    );
    expect(error).toBeNull();

    const { data: vehicle } = await user.client
      .from("vehicles")
      .select("*")
      .single();
    expect(vehicle).toMatchObject({
      id: vehicleId,
      owner_id: user.id,
      name: "2004 Cayenne Turbo",
      year: 2004,
      current_odometer: 141250,
      purchase_price_cents: 1250000,
    });

    const { data: phases } = await user.client
      .from("phases")
      .select("name, sort_order, status, vehicle_id")
      .order("sort_order");
    expect(phases?.map((p) => p.name)).toEqual(seedPhaseNames());
    expect(phases?.map((p) => p.sort_order)).toEqual([1, 2, 3, 4, 5]);
    expect(
      phases?.every(
        (p) => p.status === "planned" && p.vehicle_id === vehicleId,
      ),
    ).toBe(true);
  });

  it("refuses a second vehicle and leaves no partial writes", async () => {
    const { error } = await user.client.rpc("create_vehicle_with_phases", {
      p_name: "Second",
      p_phase_names: seedPhaseNames(),
    });
    expect(error?.code).toBe("23505");
    const { count } = await user.client
      .from("phases")
      .select("*", { count: "exact", head: true });
    expect(count).toBe(5);
  });
});
