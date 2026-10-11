// Browser-only upload pipeline (plan: Media pipeline). Bytes go straight to Supabase Storage.
import exifr from "exifr";
import imageCompression from "browser-image-compression";
import * as tus from "tus-js-client";
import { finalizeUpload, prepareUpload } from "@/lib/actions/attachments";
import { createClient } from "@/lib/db/browser";
import {
  kindForMime,
  resolveTakenAt,
  shouldCompress,
  tooLargeError,
  type AttachmentTag,
  type Parent,
} from "@/lib/domain/media";
import { publicEnv } from "@/lib/env";
import { maxUploadBytes } from "@/lib/media-links";

const BUCKET = "attachments";

export type UploadOptions = {
  parent: Parent;
  /** File images and PDFs as receipts instead of photos/documents. */
  receipt?: boolean;
  tag?: AttachmentTag | null;
  caption?: string | null;
  onProgress?: (fraction: number | null) => void;
};

export type UploadResult =
  { ok: true; id: string } | { ok: false; error: string };

/** iOS sometimes hands over HEIC with an empty type; fall back to the extension. */
function mimeFor(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (
    {
      heic: "image/heic",
      heif: "image/heif",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      mov: "video/quicktime",
      mp4: "video/mp4",
      m4a: "audio/mp4",
      pdf: "application/pdf",
    }[ext ?? ""] ?? "application/octet-stream"
  );
}

async function readTakenAt(file: File, mime: string): Promise<Date> {
  let exif = null;
  if (mime.startsWith("image/")) {
    // Raw strings: the camera's wall time, interpreted as Pacific by resolveTakenAt (spec decision).
    exif = await exifr
      .parse(file, {
        pick: [
          "DateTimeOriginal",
          "CreateDate",
          "OffsetTimeOriginal",
          "OffsetTime",
        ],
        reviveValues: false,
      })
      .catch(() => null);
  }
  return resolveTakenAt(exif, file.lastModified);
}

async function compress(
  file: File,
): Promise<{ full: File; thumb: File } | null> {
  try {
    const base = { fileType: "image/jpeg", useWebWorker: false } as const; // no worker: CSP blocks its CDN script
    const [full, thumb] = await Promise.all([
      imageCompression(file, {
        ...base,
        maxWidthOrHeight: 2560,
        initialQuality: 0.85,
      }),
      imageCompression(file, {
        ...base,
        maxWidthOrHeight: 480,
        initialQuality: 0.8,
      }),
    ]);
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return {
      full: new File([full], name, { type: "image/jpeg" }),
      thumb: new File([thumb], "thumb.jpg", { type: "image/jpeg" }),
    };
  } catch {
    return null; // undecodable: upload the original with a generic tile
  }
}

function resumableUpload(
  file: File,
  path: string,
  accessToken: string,
  onProgress?: (f: number | null) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${accessToken}`, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024, // Supabase requires exactly 6 MB chunks
      metadata: {
        bucketName: BUCKET,
        objectName: path,
        contentType: file.type,
        cacheControl: "3600",
      },
      onError: reject,
      onProgress: (sent, total) => onProgress?.(total ? sent / total : null),
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads().then((previous) => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    });
  });
}

/** Upload one file and create its attachment row. */
export async function uploadFile(
  file: File,
  opts: UploadOptions,
): Promise<UploadResult> {
  const mime = mimeFor(file);
  const kind = kindForMime(mime, { receipt: opts.receipt });
  if (!kind)
    return {
      ok: false,
      error: `${file.name}: only photos, clips, and PDFs can be uploaded.`,
    };

  const takenAt = await readTakenAt(file, mime);
  const compressed = shouldCompress(mime, file.name)
    ? await compress(file)
    : null;
  const body = compressed?.full ?? file;
  const bodyMime = compressed ? "image/jpeg" : mime;
  const tooBig = tooLargeError(body.size, maxUploadBytes());
  if (tooBig) return { ok: false, error: `${file.name}: ${tooBig}` };

  opts.onProgress?.(null);
  const prepared = await prepareUpload({
    filename: body.name,
    mime: bodyMime,
    size: body.size,
    withThumb: Boolean(compressed),
    parent: opts.parent,
  });
  if (!prepared.ok)
    return { ok: false, error: `${file.name}: ${prepared.error}` };
  const { attachmentId, path, thumbPath, strategy, token, thumbToken } =
    prepared.data;

  const supabase = createClient();
  try {
    if (strategy === "resumable") {
      const { data } = await supabase.auth.getSession();
      if (!data.session)
        return {
          ok: false,
          error: "Your session expired. Reload and try again.",
        };
      await resumableUpload(
        body,
        path,
        data.session.access_token,
        opts.onProgress,
      );
    } else {
      const { error } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(path, token!, body, { contentType: bodyMime });
      if (error) throw error;
    }
    if (compressed && thumbPath && thumbToken) {
      const { error } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(thumbPath, thumbToken, compressed.thumb, {
          contentType: "image/jpeg",
        });
      if (error) throw error;
    }
  } catch {
    return {
      ok: false,
      error: `${file.name}: the upload failed. Check your connection and try again.`,
    };
  }

  const finalized = await finalizeUpload({
    attachmentId,
    filename: body.name,
    mime: bodyMime,
    size: body.size,
    withThumb: Boolean(compressed),
    parent: opts.parent,
    kind,
    tag: opts.tag ?? null,
    taken_at: takenAt.toISOString(),
    caption: opts.caption?.trim() || null,
  });
  opts.onProgress?.(1);
  return finalized.ok
    ? { ok: true, id: finalized.data.id }
    : { ok: false, error: `${file.name}: ${finalized.error}` };
}
