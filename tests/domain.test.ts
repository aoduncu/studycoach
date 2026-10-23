import { describe, it, expect } from "vitest";
import {
  progress,
  qualified,
  level,
  balance,
  streak,
  overdue,
  today,
} from "../lib/domain";
describe("FR-011 BR-003 weighted progress", () => {
  it("weights completed tasks and handles no tasks", () => {
    expect(
      progress([{ weight: 2 }, { weight: 1 }], new Set(["a"]), ["a", "b"]),
    ).toBe(67);
    expect(progress([], new Set(), [])).toBe(0);
  });
});
it("FR-062 level boundaries", () => {
  expect([0, 99, 100, 249, 250, 1000].map(level)).toEqual([1, 1, 2, 2, 3, 6]);
});
it("FR-061 sums immutable earn/spend/reversal entries", () => {
  expect(balance([{ amount: 10 }, { amount: -4 }, { amount: -6 }])).toBe(0);
});
it("FR-063/065 thresholds", () => {
  expect(qualified(69)).toBe(false);
  expect(qualified(70)).toBe(true);
  expect(qualified(50, true)).toBe(true);
  expect(qualified(49, true)).toBe(false);
});
it("FR-031 overdue excludes completion", () => {
  expect(overdue("2026-10-22", false, new Date("2026-10-23"))).toBe(true);
  expect(overdue("2026-10-22", true, new Date("2026-10-23"))).toBe(false);
});
it("FR-063 deterministic streak across missing days", () => {
  expect(
    streak(
      [
        { date: "2026-10-20", qualified: true },
        { date: "2026-10-22", qualified: true },
        { date: "2026-10-23", qualified: true },
      ],
      "2026-10-23",
    ),
  ).toEqual({ current: 2, longest: 2 });
  expect(
    streak([{ date: "2026-10-20", qualified: true }], "2026-10-23").current,
  ).toBe(0);
});
it("Istanbul midnight is not UTC midnight", () => {
  expect(today(new Date("2026-10-22T22:00:00Z"))).toBe("2026-10-23");
});
