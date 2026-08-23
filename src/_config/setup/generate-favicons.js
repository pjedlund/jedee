import fs from 'node:fs';
import sharp from 'sharp';
import { sharpsToIco } from 'sharp-ico';
import { pathToSvgLogo } from '../../_data/meta.js';

async function createFavicons() {
  const outputDir = 'src/assets/images/favicon';
  fs.mkdirSync(outputDir, { recursive: true });

  // Get the SVG logo
  const svgBuffer = fs.readFileSync(pathToSvgLogo);

  // SVG icon
  fs.writeFileSync(`${outputDir}/favicon.svg`, svgBuffer);

  const iconBg = '#495464'; // brand slate (manifest theme_color); mark is #bbbfca

  // PNG icons
  await sharp(svgBuffer).resize(192, 192).toFile(`${outputDir}/icon-192x192.png`);
  await sharp(svgBuffer).resize(512, 512).toFile(`${outputDir}/icon-512x512.png`);

  // apple-touch-icon: opaque bg + safe-area padding so iOS doesn't render the mark edge-to-edge on black. Logo ~56% of the 180px tile; iOS rounds corners.
  await sharp(svgBuffer)
    .resize(100, 100)
    .extend({ top: 40, bottom: 40, left: 40, right: 40, background: iconBg })
    .flatten({ background: iconBg })
    .toFile(`${outputDir}/apple-touch-icon.png`);

  // maskable icon: opaque bg (Android launchers crop/mask; transparent shows through)
  await sharp(svgBuffer)
    .resize(512, 512)
    .extend({ top: 170, bottom: 170, left: 170, right: 170, background: iconBg })
    .flatten({ background: iconBg })
    .toFile(`${outputDir}/maskable-icon.png`);

  // ICO icon
  const iconSharp = sharp(svgBuffer);
  await sharpsToIco([iconSharp], `${outputDir}/favicon.ico`, { sizes: [32] });

  console.log('All favicons generated.');
}

createFavicons();