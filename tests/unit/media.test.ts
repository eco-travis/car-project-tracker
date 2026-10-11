import { describe, expect, it } from "vitest";
import exifr from "exifr";
import { monthKey, monthLabel, wallTimeToUtc } from "@/lib/domain/dates";
import {
  isHeic,
  kindForMime,
  parentColumns,
  resolveTakenAt,
  safeFilename,
  shouldCompress,
  storagePaths,
  tooLargeError,
  uploadStrategy,
} from "@/lib/domain/media";
import { baseJpeg, withExifDate } from "../support/jpeg";

describe("wallTimeToUtc (Pacific)", () => {
  it("handles standard and daylight time", () => {
    expect(
      wallTimeToUtc({
        year: 2026,
        month: 1,
        day: 15,
        hour: 9,
        minute: 0,
        second: 0,
      }).toISOString(),
    ).toBe("2026-01-15T17:00:00.000Z");
    expect(
      wallTimeToUtc({
        year: 2026,
        month: 7,
        day: 4,
        hour: 9,
        minute: 0,
        second: 0,
      }).toISOString(),
    ).toBe("2026-07-04T16:00:00.000Z");
  });

  it("handles the spring-forward day", () => {
    // 2026-03-08: clocks jump 02:00 -> 03:00 PST->PDT. 10:00 local is PDT.
    expect(
      wallTimeToUtc({
        year: 2026,
        month: 3,
        day: 8,
        hour: 10,
        minute: 0,
        second: 0,
      }).toISOString(),
    ).toBe("2026-03-08T17:00:00.000Z");
  });
});

describe("monthKey (Pacific grouping)", () => {
  it("keeps a late-evening photo in its local month", () => {
    // 9pm Pacific on Oct 31 is Nov 1 in UTC.
    expect(monthKey("2026-11-01T04:00:00Z")).toBe("2026-10");
    expect(monthLabel("2026-10")).toBe("October 2026");
  });
});

describe("resolveTakenAt", () => {
  const now = new Date("2026-10-10T12:00:00Z");

  it("reads DateTimeOriginal as Pacific wall time", () => {
    expect(
      resolveTakenAt(
        { DateTimeOriginal: "2026:10:31 21:00:00" },
        1,
        now,
      ).toISOString(),
    ).toBe("2026-11-01T04:00:00.000Z");
  });

  it("honors an explicit offset", () => {
    expect(
      resolveTakenAt(
        {
          DateTimeOriginal: "2026:10:31 21:00:00",
          OffsetTimeOriginal: "-04:00",
        },
        1,
        now,
      ).toISOString(),
    ).toBe("2026-11-01T01:00:00.000Z");
  });

  it("falls back to CreateDate, then lastModified, then now", () => {
    expect(
      resolveTakenAt(
        { CreateDate: "2026:01:15 09:00:00" },
        1,
        now,
      ).toISOString(),
    ).toBe("2026-01-15T17:00:00.000Z");
    expect(
      resolveTakenAt(
        null,
        Date.parse("2026-05-01T00:00:00Z"),
        now,
      ).toISOString(),
    ).toBe("2026-05-01T00:00:00.000Z");
    expect(
      resolveTakenAt({ DateTimeOriginal: "garbage" }, undefined, now),
    ).toBe(now);
  });

  it("works with exifr reading a real JPEG (raw strings, no local-time revival)", async () => {
    const jpeg = withExifDate(baseJpeg(), "2026:03:14 10:30:00");
    const exif = await exifr.parse(jpeg, {
      pick: ["DateTimeOriginal", "CreateDate", "OffsetTimeOriginal"],
      reviveValues: false,
    });
    expect(exif.DateTimeOriginal).toBe("2026:03:14 10:30:00");
    expect(resolveTakenAt(exif, undefined, now).toISOString()).toBe(
      "2026-03-14T17:30:00.000Z",
    );
  });
});

describe("file handling", () => {
  it("maps mime types to kinds", () => {
    expect(kindForMime("image/jpeg")).toBe("photo");
    expect(kindForMime("image/jpeg", { receipt: true })).toBe("receipt");
    expect(kindForMime("video/quicktime")).toBe("clip");
    expect(kindForMime("audio/mp4")).toBe("clip");
    expect(kindForMime("application/pdf")).toBe("document");
    expect(kindForMime("application/zip")).toBeNull();
  });

  it("compresses decodable photos only", () => {
    expect(shouldCompress("image/jpeg", "a.jpg")).toBe(true);
    expect(shouldCompress("image/heic", "a.heic")).toBe(false);
    expect(shouldCompress("", "IMG_1.HEIC")).toBe(false);
    expect(isHeic("", "IMG_1.HEIC")).toBe(true);
    expect(shouldCompress("video/mp4", "a.mp4")).toBe(false);
  });

  it("uses resumable uploads for big uncompressed files", () => {
    expect(uploadStrategy(5 * 1024 * 1024, false)).toBe("standard");
    expect(uploadStrategy(7 * 1024 * 1024, false)).toBe("resumable");
    expect(uploadStrategy(7 * 1024 * 1024, true)).toBe("standard");
  });

  it("explains files over the limit", () => {
    expect(tooLargeError(10, 100)).toBeNull();
    expect(tooLargeError(600 * 1024 * 1024, 500 * 1024 * 1024)).toBe(
      "This file is 600 MB; the limit is 500 MB. Trim the clip or upload a smaller file.",
    );
  });

  it("builds owner-prefixed storage paths with safe names", () => {
    expect(safeFilename("Front skid (1).JPG")).toBe("Front-skid-1.JPG");
    expect(safeFilename("../../etc/passwd")).toBe("etc-passwd");
    expect(safeFilename("???")).toBe("file");
    expect(storagePaths("u1", "a1", "IMG 01.jpg", true)).toEqual({
      path: "u1/a1/IMG-01.jpg",
      thumbPath: "u1/a1/thumb.jpg",
    });
  });

  it("sets exactly one parent column", () => {
    const cols = parentColumns({ kind: "job", id: "j1" });
    expect(cols.job_id).toBe("j1");
    expect(Object.values(cols).filter(Boolean)).toHaveLength(1);
    expect(Object.values(parentColumns(null)).every((v) => v === null)).toBe(
      true,
    );
  });
});
