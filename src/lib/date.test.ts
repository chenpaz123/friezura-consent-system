import {
  todayISO,
  isoToDisplay,
  displayToIso,
  formatIsraeliDate,
  formatIsraeliTime,
} from "./date";

describe("Date utilities", () => {
  describe("todayISO", () => {
    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it("returns the current date in YYYY-MM-DD format based on local time", () => {
      const date = new Date("2024-03-15T12:30:00Z");
      jest.setSystemTime(date);

      const localYear = date.getFullYear();
      const localMonth = String(date.getMonth() + 1).padStart(2, "0");
      const localDay = String(date.getDate()).padStart(2, "0");
      const expected = `${localYear}-${localMonth}-${localDay}`;

      expect(todayISO()).toBe(expected);
    });
  });

  describe("isoToDisplay", () => {
    it("converts valid ISO date to DD/MM/YYYY format", () => {
      expect(isoToDisplay("2024-03-15")).toBe("15/03/2024");
      expect(isoToDisplay("1999-12-31")).toBe("31/12/1999");
    });

    it("returns an empty string for invalid formats", () => {
      expect(isoToDisplay("")).toBe("");
      expect(isoToDisplay("2024-3-15")).toBe("");
      expect(isoToDisplay("15-03-2024")).toBe("");
      expect(isoToDisplay("2024/03/15")).toBe("");
      expect(isoToDisplay("invalid")).toBe("");
    });
  });

  describe("displayToIso", () => {
    it("converts valid DD/MM/YYYY date to ISO format", () => {
      expect(displayToIso("15/03/2024")).toBe("2024-03-15");
      expect(displayToIso("31/12/1999")).toBe("1999-12-31");
      expect(displayToIso("29/02/2024")).toBe("2024-02-29");
    });

    it("returns null for invalid formats", () => {
      expect(displayToIso("")).toBeNull();
      expect(displayToIso("15-03-2024")).toBeNull();
      expect(displayToIso("2024-03-15")).toBeNull();
      expect(displayToIso("invalid")).toBeNull();
    });

    it("returns null for invalid calendar dates", () => {
      expect(displayToIso("32/03/2024")).toBeNull();
      expect(displayToIso("15/13/2024")).toBeNull();
      expect(displayToIso("00/03/2024")).toBeNull();
      expect(displayToIso("15/00/2024")).toBeNull();
      expect(displayToIso("29/02/2023")).toBeNull();
      expect(displayToIso("31/04/2024")).toBeNull();
    });
  });

  describe("formatIsraeliDate", () => {
    it("formats a Date object to DD/MM/YYYY based on local time", () => {
      const date = new Date(2024, 2, 15, 14, 30, 0);
      expect(formatIsraeliDate(date)).toBe("15/03/2024");
    });

    it("pads single digit days and months", () => {
      const date = new Date(2024, 0, 5, 14, 30, 0);
      expect(formatIsraeliDate(date)).toBe("05/01/2024");
    });
  });

  describe("formatIsraeliTime", () => {
    it("formats a Date object to HH:MM based on local time", () => {
      const date = new Date(2024, 2, 15, 14, 30, 0);
      expect(formatIsraeliTime(date)).toBe("14:30");
    });

    it("pads single digit hours and minutes", () => {
      const date = new Date(2024, 2, 15, 9, 5, 0);
      expect(formatIsraeliTime(date)).toBe("09:05");
    });

    it("handles midnight correctly", () => {
      const date = new Date(2024, 2, 15, 0, 0, 0);
      expect(formatIsraeliTime(date)).toBe("00:00");
    });
  });
});
