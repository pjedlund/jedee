import fs from 'node:fs';
import sharp from 'sharp';
import { sharpsToIco } from 'sharp-ico';
import { pathToSvgLogo, themeLight } from '../../_data/meta.js';

const PAD = 0.2; // breathing room on each side, as a fraction of the icon box — the mark fills the middle 60%
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

async function createFavicons() {
  const outputDir = 'src/assets/images/favicon';
  fs.mkdirSync(outputDir, { recursive: true });

  // Get the SVG logo
  const svgBuffer = fs.readFileSync(pathToSvgLogo);

  // Render the mark at `size` with PAD on every side; opaque `background` for tiles that get cropped or sat on black.
  const padded = (size, background = TRANSPARENT) => {
    const pad = Math.round(size * PAD);
    const image = sharp(svgBuffer)
      .resize(size - pad * 2, size - pad * 2)
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background });
    return background === TRANSPARENT ? image : image.flatten({ background });
  };

  // SVG icon: same padding done in the viewBox, since there's nothing to resize.
  const svgBox = 100 / (1 - PAD * 2);
  const svgOffset = -(svgBox - 100) / 2;
  const svgSource = svgBuffer.toString();
  if (!/viewBox="0 0 100 100"/.test(svgSource)) throw new Error(`${pathToSvgLogo}: expected viewBox="0 0 100 100" to pad — check the logo before trusting the favicons.`);
  fs.writeFileSync(`${outputDir}/favicon.svg`, svgSource.replace('viewBox="0 0 100 100"', `viewBox="${svgOffset.toFixed(3)} ${svgOffset.toFixed(3)} ${svgBox.toFixed(3)} ${svgBox.toFixed(3)}"`));

  // PNG icons
  await padded(192).toFile(`${outputDir}/icon-192x192.png`);
  await padded(512).toFile(`${outputDir}/icon-512x512.png`);

  // apple-touch-icon + maskable: opaque light ground so the orange mark reads, and so iOS/Android launchers don't mask through transparency.
  await padded(180, themeLight).toFile(`${outputDir}/apple-touch-icon.png`);
  await padded(512, themeLight).toFile(`${outputDir}/maskable-icon.png`);

  // ICO icon
  await sharpsToIco([padded(32)], `${outputDir}/favicon.ico`, { sizes: [32] });

  console.log('All favicons generated.');
}

createFavicons();
