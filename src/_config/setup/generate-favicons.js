import fs from 'node:fs';
import sharp from 'sharp';
import { sharpsToIco } from 'sharp-ico';
import { pathToSvgLogo, themeLight } from '../../_data/meta.js';

const { 'base-light': iconGround } = JSON.parse(fs.readFileSync('src/_data/designTokens/colors.json', 'utf8')); // the manifest icons' plate — a token, so it moves with the palette

const TAB_PAD = 1 / 16; // browser tab: a 14px mark in a 16px box — there's no room to be generous at that size
const TILE_PAD = 0.222; // app icons and home-screen tiles: the roomier inset, since the OS frames them anyway
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function createFavicons() {
  const outputDir = 'src/assets/images/favicon';
  fs.mkdirSync(outputDir, { recursive: true });

  // Get the SVG logo
  const svgBuffer = fs.readFileSync(pathToSvgLogo);
  const svgSource = svgBuffer.toString();

  // The mark's own fill is the single source of truth for the brand color — the tiles invert it into their ground. ⚠
  const markColor = svgSource.match(/<svg[^>]*\sfill="([^"]+)"/)?.[1];
  if (!markColor) throw new Error(`${pathToSvgLogo}: no fill on the root <svg> — the tile colors are derived from it.`);
  const knockout = Buffer.from(svgSource.replaceAll(markColor, themeLight));

  // Render the mark at `size` with `pad` on every side; opaque `background` for tiles that get cropped or sat on black.
  const padded = (source, size, pad, background = TRANSPARENT) => {
    const p = Math.round(size * pad);
    const image = sharp(source)
      .resize(size - p * 2, size - p * 2)
      .extend({ top: p, bottom: p, left: p, right: p, background });
    return background === TRANSPARENT ? image : image.flatten({ background });
  };

  // SVG icon: same inset done in the viewBox, since there's nothing to resize.
  const box = 100 / (1 - TAB_PAD * 2);
  const offset = -(box - 100) / 2;
  if (!/viewBox="0 0 100 100"/.test(svgSource)) throw new Error(`${pathToSvgLogo}: expected viewBox="0 0 100 100" to pad — check the logo before trusting the favicons.`);
  fs.writeFileSync(`${outputDir}/favicon.svg`, svgSource.replace('viewBox="0 0 100 100"', `viewBox="${offset.toFixed(3)} ${offset.toFixed(3)} ${box.toFixed(3)} ${box.toFixed(3)}"`));

  // PNG icons: opaque base-light plate, so the mark reads as a tile on the install sheet and the splash rather than floating on whatever is behind it.
  await padded(svgBuffer, 192, TILE_PAD, iconGround.$value).toFile(`${outputDir}/icon-192x192.png`);
  await padded(svgBuffer, 512, TILE_PAD, iconGround.$value).toFile(`${outputDir}/icon-512x512.png`);

  // apple-touch-icon + maskable: the mark knocked out of a solid brand ground, so the tile reads as a logo and launchers have no transparency to mask through.
  await padded(knockout, 180, TILE_PAD, markColor).toFile(`${outputDir}/apple-touch-icon.png`);
  await padded(knockout, 512, TILE_PAD, markColor).toFile(`${outputDir}/maskable-icon.png`);

  // ICO icon — hand sharpsToIco a finished buffer, not a pending pipeline: its own resize() overrides ours and the extend() then pads on top of that. ⚠
  const icoBuffer = await padded(svgBuffer, 32, TAB_PAD).png().toBuffer();
  await sharpsToIco([sharp(icoBuffer)], `${outputDir}/favicon.ico`, { sizes: [32] });

  console.log('All favicons generated.');
}

createFavicons();
