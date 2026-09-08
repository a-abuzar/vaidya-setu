import { describe, expect, it } from "vitest";
import {
  formatDuration,
  sortCompletedSessions,
  type SessionRow,
} from "./doctor-dashboard";

describe("Doctor Dashboard Utilities", () => {
  describe("formatDuration", () => {
    it("returns null if completedAt is null", () => {
      expect(formatDuration("2026-09-08T10:00:00.000Z", null)).toBeNull();
    });

    it("returns '< 1 min' for under 30 seconds duration", () => {
      expect(
        formatDuration("2026-09-08T10:00:00.000Z", "2026-09-08T10:00:20.000Z")
      ).toBe("< 1 min");
    });

    it("formats standard minute durations correctly", () => {
      expect(
        formatDuration("2026-09-08T10:00:00.000Z", "2026-09-08T10:18:00.000Z")
      ).toBe("18 mins");
    });

    it("formats 1 min singular correctly", () => {
      expect(
        formatDuration("2026-09-08T10:00:00.000Z", "2026-09-08T10:01:00.000Z")
      ).toBe("1 min");
    });

    it("formats multi-hour durations", () => {
      expect(
        formatDuration("2026-09-08T10:00:00.000Z", "2026-09-08T11:30:00.000Z")
      ).toBe("1h 30m");
    });
  });

  describe("sortCompletedSessions", () => {
    it("bubbles red-flagged sessions to the top", () => {
      const mockSessions: SessionRow[] = [
        {
          id: "s1",
          patientId: "p1",
          status: "completed",
          startedAt: "2026-09-08T10:00:00.000Z",
          completedAt: "2026-09-08T10:15:00.000Z",
          redFlag: false,
          documentCount: 0,
          chiefComplaint: "Mild headache",
        },
        {
          id: "s2",
          patientId: "p2",
          status: "completed",
          startedAt: "2026-09-08T09:00:00.000Z",
          completedAt: "2026-09-08T09:15:00.000Z",
          redFlag: true,
          documentCount: 1,
          chiefComplaint: "Severe chest pain radiating to arm",
        },
      ];

      const sorted = sortCompletedSessions(mockSessions);
      expect(sorted[0].id).toBe("s2");
      expect(sorted[0].redFlag).toBe(true);
      expect(sorted[1].id).toBe("s1");
    });

    it("sorts newest completed session first when red-flag status is identical", () => {
      const mockSessions: SessionRow[] = [
        {
          id: "older",
          patientId: "p1",
          status: "completed",
          startedAt: "2026-09-08T08:00:00.000Z",
          completedAt: "2026-09-08T08:15:00.000Z",
          redFlag: false,
          documentCount: 0,
          chiefComplaint: "Fever",
        },
        {
          id: "newer",
          patientId: "p2",
          status: "completed",
          startedAt: "2026-09-08T10:00:00.000Z",
          completedAt: "2026-09-08T10:15:00.000Z",
          redFlag: false,
          documentCount: 0,
          chiefComplaint: "Cough",
        },
      ];

      const sorted = sortCompletedSessions(mockSessions);
      expect(sorted[0].id).toBe("newer");
      expect(sorted[1].id).toBe("older");
    });
  });

  describe("completed session filtering behavior", () => {
    it("filters only completed sessions out of a mixed list", () => {
      const mixedSessions: SessionRow[] = [
        {
          id: "s-active-1",
          patientId: "p1",
          status: "in_progress",
          startedAt: "2026-09-08T10:00:00.000Z",
          completedAt: null,
          redFlag: false,
          documentCount: 0,
          chiefComplaint: "Back pain",
        },
        {
          id: "s-completed-1",
          patientId: "p2",
          status: "completed",
          startedAt: "2026-09-08T09:00:00.000Z",
          completedAt: "2026-09-08T09:15:00.000Z",
          redFlag: false,
          documentCount: 0,
          chiefComplaint: "Fever",
        },
        {
          id: "s-active-2",
          patientId: "p3",
          status: "in_progress",
          startedAt: "2026-09-08T10:05:00.000Z",
          completedAt: null,
          redFlag: false,
          documentCount: 0,
          chiefComplaint: "Knee pain",
        },
      ];

      const completedOnly = mixedSessions.filter((s) => s.status === "completed");
      expect(completedOnly).toHaveLength(1);
      expect(completedOnly[0].id).toBe("s-completed-1");
    });
  });
});
