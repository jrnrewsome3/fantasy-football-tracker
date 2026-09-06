import { describe, expect, it, vi } from "vitest";

import { fetchRecentActivity } from "./espnClient";

describe("fetchRecentActivity", () => {
  it("returns an empty feed when the installed ESPN client has no activity API", async () => {
    await expect(fetchRecentActivity({}, 2026)).resolves.toEqual([]);
  });

  it("maps activity when a compatible client method is available", async () => {
    const getRecentActivity = vi.fn().mockResolvedValue([
      {
        type: "ADD",
        date: "2026-09-06T12:00:00.000Z",
        teamId: 3,
        playerId: 123,
        playerName: "Example Player",
      },
    ]);

    const result = await fetchRecentActivity({ getRecentActivity }, 2026);

    expect(getRecentActivity).toHaveBeenCalledWith({
      seasonId: 2026,
      size: 50,
    });
    expect(result).toEqual([
      expect.objectContaining({
        type: "ADD",
        teamId: 3,
        playerId: 123,
        playerName: "Example Player",
        date: new Date("2026-09-06T12:00:00.000Z"),
      }),
    ]);
  });
});
