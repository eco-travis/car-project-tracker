// Renders the app icon (SVG below) to the PNG sizes the manifest and iOS need.
// Run: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/make-icons.mts
import { chromium } from "@playwright/test";

const glyph = (scale: number) => `
  <g transform="translate(256 262) scale(${scale}) translate(-256 -262)" fill="none" stroke="#f5f5f4" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
    <path d="M86 330 L196 186 L256 262 L300 210 L426 330 Z" fill="#f5f5f4" stroke="none"/>
    <path d="M196 186 L226 224 L196 214 L172 230 Z" fill="#111" stroke="none"/>
    <path d="M96 388 C176 360 336 360 416 388"/>
  </g>
  <text x="256" y="452" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${56 * scale}" fill="#f5f5f4" letter-spacing="6">955</text>`;

const icon = (opts: { maskable: boolean }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${opts.maskable ? `<rect width="512" height="512" fill="#111"/>` : `<rect width="512" height="512" rx="112" fill="#111"/>`}
  ${glyph(opts.maskable ? 0.8 : 1)}
</svg>`;

const outputs = [
  { file: "public/icons/icon-192.png", size: 192, maskable: false },
  { file: "public/icons/icon-512.png", size: 512, maskable: false },
  { file: "public/icons/maskable-512.png", size: 512, maskable: true },
  { file: "app/apple-icon.png", size: 180, maskable: true }, // iOS rounds corners itself
  { file: "app/icon.png", size: 64, maskable: false },
];

const browser = await chromium.launch();
for (const o of outputs) {
  const page = await browser.newPage({
    viewport: { width: o.size, height: o.size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${icon(o).replace('width="512" height="512" viewBox', `width="${o.size}" height="${o.size}" viewBox`)}</body></html>`,
  );
  await page.screenshot({
    path: o.file,
    omitBackground: true,
    clip: { x: 0, y: 0, width: o.size, height: o.size },
  });
  await page.close();
  console.log(`wrote ${o.file}`);
}
await browser.close();
