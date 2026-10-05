// Renders the app icons from js/render.js's logo: icons/icon.svg plus PNGs for iPad/iPhone and Android.
// Usage: node tools/make-icons.js   (needs Playwright with Chromium; dev-only)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
for (const f of ['data', 'logic', 'render']) require(path.join(root, 'js', f + '.js'));
const DG = globalThis.DG;
const svg = DG.logoSVG(512, { square: true })   // full-bleed: iOS and Android round the corners themselves
.replace('class="logo" ', 'xmlns="http://www.w3.org/2000/svg" ').replace(' aria-hidden="true"', '');
fs.mkdirSync(path.join(root, 'icons'), { recursive: true });
fs.writeFileSync(path.join(root, 'icons', 'icon.svg'), svg);
(async () => {
  const { chromium } = require('playwright');
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const b = await chromium.launch({ executablePath: exe });
  const p = await b.newPage();
  for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:#fdf0f2">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    await p.screenshot({ path: path.join(root, 'icons', name), clip: { x: 0, y: 0, width: size, height: size } });
    console.log('wrote icons/' + name);
  }
  await b.close();
})();
