/** RSS 2.0 <enclosure> derivation for the Audio + Video podcast feed (audio
 * spec §9, video spec §10). An <enclosure> needs a byte `length` and a MIME `type`, and the only honest source for both is the real file on disk — so these stat the source media at build time. Shared by both media types (Video uses them only for the `file` provider; embeds carry no enclosure).
 *
 * Path convention follows Photo/Recipe, not the spec's page-bundle framing: media lives under src/assets/ and is referenced as "./src/assets/…", which is already disk-relative from the project root, so statSync reads it directly and the public URL is the same path minus "./src". */

import { statSync } from 'node:fs';
import path from 'node:path';

/** Extension → MIME, covering the audio/video container formats we ship. */
const MIME_BY_EXT = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime'
};

/** Byte length of the source media file ("./src/assets/…" → disk path).
 * Returns 0 when the file is missing so the feed still builds (the missing file is the real problem to surface, not a thrown build). */
export const enclosureBytes = src => {
  if (typeof src !== 'string' || !src) return 0;
  try {
    return statSync(src).size;
  } catch {
    return 0;
  }
};

/** MIME type from the file extension; octet-stream as a safe fallback. */
export const enclosureType = src => {
  if (typeof src !== 'string' || !src) return 'application/octet-stream';
  return MIME_BY_EXT[path.extname(src).toLowerCase()] || 'application/octet-stream';
};
