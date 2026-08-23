// Build-time, curated EXIF/IPTC/XMP extraction for photo posts.
//
// Reads an allowlisted, render-safe set of fields from a local image and splits them into two groups:
//   - capture:  what made the photograph (camera, film date, place, GPS).
//               The pinhole/lens line is intentionally NOT surfaced — the camera
//               model already conveys the pinhole, so it read as redundant.
//   - scan:     the digitization rig (the scanner's aperture/shutter/focal/lens,
//               software, scan date) — labelled separately so f/8 · 1/60 is never
//               mistaken for the pinhole's exposure.
//
// It DELIBERATELY never returns the creator contact fields (home address, phone, email) that live in the file's XMP — they must not reach a rendered page.
//
// Dates are formatted from the raw wall-clock string, never a revived Date — a Netlify build running in UTC would otherwise shift a midnight-local capture to the previous day.
import exifr from 'exifr';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Normalize a front-matter src ("./src/…", "/assets/…", "assets/…") to a path exifr can read from the project root. Mirrors image.js's ./src prepend.
const toFsPath = src => {
  if (src.startsWith('./src')) return src;
  if (src.startsWith('/')) return `./src${src}`;
  return `./src/${src}`;
};

// "2023:09:16 00:00:00" → "16 September 2023" (timezone-agnostic).
const formatExifDate = raw => {
  if (!raw || typeof raw !== 'string') return undefined;
  const [datePart] = raw.split(' ');
  const [y, m, d] = datePart.split(':').map(Number);
  if (!y || !m || !d) return undefined;
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

// 0.016666… → "1/60";  2 → "2 s"
const formatExposure = t => {
  if (t == null) return undefined;
  if (t >= 1) return `${Number.isInteger(t) ? t : t.toFixed(1)} s`;
  return `1/${Math.round(1 / t)}`;
};

// LensInfo [minFocal, maxFocal, minF, maxF] → "90 mm f/2.8"
const formatLensInfo = li => {
  if (!Array.isArray(li) || li.length < 4) return undefined;
  const [minF, maxF, , maxAp] = li;
  if (minF == null) return undefined;
  const focal = minF === maxF ? `${minF} mm` : `${minF}–${maxF} mm`;
  return maxAp ? `${focal} f/${maxAp}` : focal;
};

/**
 * Extract curated photo metadata from a local image path.
 * @param {string} src front-matter `photo.src`
 * @returns {Promise<object|null>} render-safe metadata, or null if unreadable
 */
export async function extractPhotoExif(src) {
  if (!src) return null;
  const path = toFsPath(src);

  let d, raw;
  try {
    d = await exifr.parse(path, { tiff: true, ifd0: true, exif: true, gps: true, iptc: true, xmp: true, mergeOutput: true });
    // Raw (un-revived) read for tz-safe date formatting.
    raw = await exifr.parse(path, { pick: ['DateTimeOriginal', 'CreateDate'], reviveValues: false });
  } catch {
    return null;
  }
  if (!d) return null;

  const camera = [d.Make, d.Model].filter(Boolean).join(' ').trim() || undefined;

  const place = (d.City || d.State || d.Country)
    ? { city: d.City || undefined, region: d.State || undefined, country: d.Country || undefined }
    : undefined;

  const gps = (typeof d.latitude === 'number' && typeof d.longitude === 'number')
    ? { lat: d.latitude, lon: d.longitude }
    : undefined;

  return {
    // --- capture: what made the photograph ---
    camera,
    dateTaken: formatExifDate(raw && raw.DateTimeOriginal),
    place,
    gps,
    // --- scan / technical: the digitization rig ---
    aperture: d.FNumber != null ? `f/${d.FNumber}` : undefined,
    exposure: formatExposure(d.ExposureTime),
    iso: d.ISO != null ? d.ISO : undefined,
    focalLength: d.FocalLength != null ? `${d.FocalLength} mm` : undefined,
    focalLength35: d.FocalLengthIn35mmFormat != null ? `${d.FocalLengthIn35mmFormat} mm` : undefined,
    scanLens: formatLensInfo(d.LensInfo),
    software: d.Software || undefined,
    dateDigitized: formatExifDate(raw && raw.CreateDate)
  };
}
