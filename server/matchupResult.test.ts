import { describe, expect, it } from "vitest";
import { completedResult } from "../shared/matchupResult";
describe("completed matchup labels", () => {
  it("names an away winner without reversing scores", () =>
    expect(completedResult("Dino", "Mayhem Rising", 132.3, 155.7)).toBe(
      "Mayhem Rising won 155.7–132.3 over Dino"
    ));
  it("names a home winner", () =>
    expect(completedResult("A", "B", 138.4, 137.8)).toBe(
      "A won 138.4–137.8 over B"
    ));
  it("does not invent a winner for a tie", () =>
    expect(completedResult("A", "B", 100, 100)).toBe(
      "A and B tied 100.0–100.0"
    ));
});
