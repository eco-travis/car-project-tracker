import { readFileSync } from "node:fs";
import path from "node:path";

/** A tiny real JPEG for tests (96×64). */
export function baseJpeg(): Buffer {
  return readFileSync(path.join(__dirname, "../fixtures/base.jpg"));
}

/**
 * Returns `jpeg` with its EXIF replaced by one carrying DateTimeOriginal ("YYYY:MM:DD HH:MM:SS").
 * Minimal little-endian TIFF: IFD0 -> ExifIFD pointer -> DateTimeOriginal.
 */
export function withExifDate(jpeg: Buffer, dateTimeOriginal: string): Buffer {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error("Not a JPEG");
  const tiff = Buffer.alloc(64);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4); // IFD0 offset
  // IFD0: one entry, ExifIFDPointer (0x8769, LONG) -> 26
  tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x8769, 10);
  tiff.writeUInt16LE(4, 12);
  tiff.writeUInt32LE(1, 14);
  tiff.writeUInt32LE(26, 18);
  tiff.writeUInt32LE(0, 22);
  // ExifIFD at 26: one entry, DateTimeOriginal (0x9003, ASCII, 20) -> 44
  tiff.writeUInt16LE(1, 26);
  tiff.writeUInt16LE(0x9003, 28);
  tiff.writeUInt16LE(2, 30);
  tiff.writeUInt32LE(20, 32);
  tiff.writeUInt32LE(44, 36);
  tiff.writeUInt32LE(0, 40);
  tiff.write(`${dateTimeOriginal}\0`, 44, "ascii");

  const payload = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const app1 = Buffer.alloc(4);
  app1.writeUInt16BE(0xffe1, 0);
  app1.writeUInt16BE(payload.length + 2, 2);

  // Copy the original segments, dropping any existing APP1, until the image data starts.
  const kept: Buffer[] = [];
  let i = 2;
  while (i < jpeg.length) {
    const marker = jpeg.readUInt16BE(i);
    if (marker === 0xffda) {
      kept.push(jpeg.subarray(i));
      break;
    }
    const len = jpeg.readUInt16BE(i + 2);
    if (marker !== 0xffe1) kept.push(jpeg.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return Buffer.concat([jpeg.subarray(0, 2), app1, payload, ...kept]);
}
