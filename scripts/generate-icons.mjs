import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const repoRoot = process.cwd();
const webIconsDir = path.join(repoRoot, 'apps', 'web', 'public', 'icons');
const webPublicDir = path.join(repoRoot, 'apps', 'web', 'public');
const mobileAssetsDir = path.join(repoRoot, 'apps', 'mobile', 'assets');
const iosPrepDir = path.join(mobileAssetsDir, 'ios-appicon');
const iconSourceDir = path.join(repoRoot, 'resources', 'icon-source');
const composerDir = path.join(webIconsDir, 'icon-composer-layers');
const storedSourcePath = path.join(iconSourceDir, 'baristachaw-source.png');

const sourceCandidates = [
  process.env.BARISTACHAW_ICON_SOURCE,
  storedSourcePath,
  'C:\\Users\\Alpha\\Downloads\\IMG_7090.PNG',
].filter(Boolean);

const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content.trimStart(), 'utf8');
}

function writePng(filePath, png) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, PNG.sync.write(png));
}

function copyFile(source, target) {
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function readSourcePath() {
  const sourcePath = sourceCandidates.find((candidate) => fs.existsSync(candidate));
  if (!sourcePath) {
    throw new Error(
      `Icon source not found. Set BARISTACHAW_ICON_SOURCE or place the source at ${storedSourcePath}`,
    );
  }
  return sourcePath;
}

function offset(width, x, y) {
  return (y * width + x) * 4;
}

function isWhiteBackgroundPixel(data, index) {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min >= 224 && max - min <= 48;
}

function removeConnectedWhiteBackground(input) {
  const { width, height, data } = input;
  const out = new PNG({ width, height });
  data.copy(out.data);

  const visited = new Uint8Array(width * height);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (visited[pixel]) return;
    if (!isWhiteBackgroundPixel(data, offset(width, x, y))) return;
    visited[pixel] = 1;
    stack.push([x, y]);
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (stack.length) {
    const [x, y] = stack.pop();
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const i = offset(width, x, y);
      if (visited[pixel]) {
        out.data[i + 3] = 0;
      }
    }
  }

  return out;
}

function sampleNearest(src, x, y) {
  const sx = Math.max(0, Math.min(src.width - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(src.height - 1, Math.round(y)));
  const i = offset(src.width, sx, sy);
  return [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]];
}

function renderIconPng(src, size, options = {}) {
  const {
    scale = 1,
    background = [0, 0, 0, 255],
    transparentBackground = false,
    mono = false,
  } = options;
  const dst = new PNG({ width: size, height: size });
  const drawSize = size * scale;
  const left = (size - drawSize) / 2;
  const top = (size - drawSize) / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const di = offset(size, x, y);
      if (transparentBackground) {
        dst.data[di] = 0;
        dst.data[di + 1] = 0;
        dst.data[di + 2] = 0;
        dst.data[di + 3] = 0;
      } else {
        dst.data[di] = background[0];
        dst.data[di + 1] = background[1];
        dst.data[di + 2] = background[2];
        dst.data[di + 3] = background[3];
      }

      if (x < left || y < top || x >= left + drawSize || y >= top + drawSize) continue;
      const sx = ((x - left) / drawSize) * (src.width - 1);
      const sy = ((y - top) / drawSize) * (src.height - 1);
      const [r, g, b, a] = sampleNearest(src, sx, sy);
      if (a === 0) continue;

      if (mono) {
        const visible = a > 12 && Math.max(r, g, b) > 16;
        if (!visible) continue;
        dst.data[di] = 255;
        dst.data[di + 1] = 255;
        dst.data[di + 2] = 255;
        dst.data[di + 3] = a;
        continue;
      }

      const alpha = a / 255;
      const inv = 1 - alpha;
      dst.data[di] = Math.round(r * alpha + dst.data[di] * inv);
      dst.data[di + 1] = Math.round(g * alpha + dst.data[di + 1] * inv);
      dst.data[di + 2] = Math.round(b * alpha + dst.data[di + 2] * inv);
      dst.data[di + 3] = 255;
    }
  }

  return dst;
}

function dataUriFromPng(png) {
  return `data:image/png;base64,${PNG.sync.write(png).toString('base64')}`;
}

function rasterIconSvg(dataUri, { maskable = false } = {}) {
  const inset = maskable ? 74 : 0;
  const imageSize = 1024 - inset * 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="BaristaChaw app icon">
  <rect width="1024" height="1024" fill="#000000"/>
  <image href="${dataUri}" x="${inset}" y="${inset}" width="${imageSize}" height="${imageSize}" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
}

function monoSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" aria-label="BaristaChaw monochrome app icon">
  <g fill="#000000">
    <path d="M382 350v-50c0-58 47-105 105-105h50c58 0 105 47 105 105v50c74 42 128 112 147 194h41c56 0 102 46 102 102v78c0 56-46 102-102 102h-43c-50 109-158 185-285 185s-235-76-285-185h-43c-56 0-102-46-102-102v-78c0-56 46-102 102-102h41c19-82 73-152 147-194Zm37-43v22c30-10 62-15 95-15s65 5 95 15v-22c0-21-17-38-38-38H457c-21 0-38 17-38 38Zm95 86c-132 0-239 107-239 239s107 239 239 239 239-107 239-239S646 393 514 393Z"/>
    <rect x="335" y="559" width="358" height="198" rx="88"/>
    <rect x="404" y="642" width="62" height="118" rx="31"/>
    <rect x="562" y="642" width="62" height="118" rx="31"/>
    <rect x="466" y="451" width="28" height="28" rx="3"/>
    <rect x="514" y="431" width="28" height="28" rx="3"/>
    <rect x="562" y="451" width="28" height="28" rx="3"/>
    <rect x="514" y="493" width="28" height="28" rx="3"/>
  </g>
</svg>`;
}

function composerBackgroundSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#000000"/>
</svg>`;
}

function composerHighlightSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <path d="M118 108C194 58 302 42 456 42h112c156 0 262 16 338 66" fill="none" stroke="#93c5fd" stroke-opacity="0.35" stroke-width="2"/>
</svg>`;
}

function mimeForFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.svg') return 'image/svg+xml';
  if (extension === '.png') return 'image/png';
  return 'application/octet-stream';
}

function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const rawPath = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
    const safeRelativePath = rawPath.replace(/^\/+/, '').replaceAll('\\', '/');
    const filePath = path.resolve(rootDir, safeRelativePath);
    if (!filePath.startsWith(path.resolve(rootDir))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeForFile(filePath), 'Cache-Control': 'no-store' });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function renderSvg(svgPath, outputPath, size) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  const staticServer = await startStaticServer(webPublicDir);
  try {
    const publicPath = path.relative(webPublicDir, svgPath).replaceAll('\\', '/');
    const url = `${staticServer.origin}/${publicPath}`;
    await page.goto(url, { waitUntil: 'load' });
    await page.screenshot({
      path: outputPath,
      clip: { x: 0, y: 0, width: size, height: size },
      omitBackground: true,
    });
  } finally {
    await new Promise((resolve) => staticServer.server.close(resolve));
    await browser.close();
  }
}

async function main() {
  ensureDir(webIconsDir);
  ensureDir(mobileAssetsDir);
  ensureDir(iconSourceDir);
  ensureDir(composerDir);
  ensureDir(iosPrepDir);

  const sourcePath = readSourcePath();
  if (path.resolve(sourcePath) !== path.resolve(storedSourcePath)) {
    copyFile(sourcePath, storedSourcePath);
  }

  const sourcePng = PNG.sync.read(fs.readFileSync(sourcePath));
  const clean = removeConnectedWhiteBackground(sourcePng);
  const base1024 = renderIconPng(clean, 1024, { background: [0, 0, 0, 255] });
  const maskable1024 = renderIconPng(clean, 1024, { background: [0, 0, 0, 255], scale: 0.86 });
  const mono1024 = renderIconPng(clean, 1024, { transparentBackground: true, mono: true, scale: 0.9 });
  const sourceDataUri = dataUriFromPng(clean);

  writePng(path.join(webIconsDir, 'icon-source-clean.png'), clean);
  writePng(path.join(webIconsDir, 'icon-source-foreground.png'), clean);

  writeText(path.join(webIconsDir, 'icon-light.svg'), rasterIconSvg(sourceDataUri));
  writeText(path.join(webIconsDir, 'icon-dark.svg'), rasterIconSvg(sourceDataUri));
  writeText(path.join(webIconsDir, 'icon-maskable.svg'), rasterIconSvg(sourceDataUri, { maskable: true }));
  writeText(path.join(webIconsDir, 'icon-master.svg'), rasterIconSvg(sourceDataUri));
  writeText(path.join(webIconsDir, 'icon-192.svg'), rasterIconSvg(sourceDataUri));
  writeText(path.join(webIconsDir, 'icon-512.svg'), rasterIconSvg(sourceDataUri));
  writeText(path.join(webIconsDir, 'icon-mono.svg'), monoSvg());
  writeText(path.join(webPublicDir, 'favicon.svg'), rasterIconSvg(sourceDataUri));

  writeText(path.join(composerDir, 'background.svg'), composerBackgroundSvg());
  writeText(path.join(composerDir, 'foreground.svg'), rasterIconSvg(sourceDataUri));
  writeText(path.join(composerDir, 'highlight.svg'), composerHighlightSvg());
  writeText(path.join(composerDir, 'mono.svg'), monoSvg());

  for (const size of sizes) {
    writePng(path.join(webIconsDir, `icon-${size}.png`), renderIconPng(clean, size, { background: [0, 0, 0, 255] }));
    writePng(path.join(webIconsDir, `icon-maskable-${size}.png`), renderIconPng(clean, size, { background: [0, 0, 0, 255], scale: 0.86 }));
  }

  writePng(path.join(webIconsDir, 'icon-dark-512.png'), renderIconPng(clean, 512, { background: [0, 0, 0, 255] }));
  writePng(path.join(webIconsDir, 'icon-dark-1024.png'), base1024);
  writePng(path.join(webIconsDir, 'icon-mono-512.png'), renderIconPng(clean, 512, { transparentBackground: true, mono: true, scale: 0.9 }));
  writePng(path.join(webIconsDir, 'icon-mono-1024.png'), mono1024);

  copyFile(path.join(webIconsDir, 'icon-16.png'), path.join(webIconsDir, 'favicon-16x16.png'));
  copyFile(path.join(webIconsDir, 'icon-32.png'), path.join(webIconsDir, 'favicon-32x32.png'));
  copyFile(path.join(webIconsDir, 'icon-180.png'), path.join(webIconsDir, 'apple-touch-icon.png'));
  copyFile(path.join(webIconsDir, 'icon-maskable-192.png'), path.join(webIconsDir, 'icon-192-maskable.png'));
  copyFile(path.join(webIconsDir, 'icon-maskable-512.png'), path.join(webIconsDir, 'icon-512-maskable.png'));

  writePng(path.join(mobileAssetsDir, 'icon.png'), base1024);
  writePng(path.join(mobileAssetsDir, 'favicon.png'), renderIconPng(clean, 48, { background: [0, 0, 0, 255] }));
  writePng(path.join(mobileAssetsDir, 'android-icon-background.png'), renderIconPng(clean, 1024, { background: [0, 0, 0, 255], scale: 0 }));
  writePng(path.join(mobileAssetsDir, 'android-icon-foreground.png'), maskable1024);
  writePng(path.join(mobileAssetsDir, 'android-icon-monochrome.png'), mono1024);
  writePng(path.join(mobileAssetsDir, 'splash-icon.png'), renderIconPng(clean, 1024, { transparentBackground: true, scale: 0.72 }));

  copyFile(path.join(webIconsDir, 'icon-1024.png'), path.join(iosPrepDir, 'AppIcon-Light-1024.png'));
  copyFile(path.join(webIconsDir, 'icon-dark-1024.png'), path.join(iosPrepDir, 'AppIcon-Dark-1024.png'));
  copyFile(path.join(webIconsDir, 'icon-mono-1024.png'), path.join(iosPrepDir, 'AppIcon-Tinted-Mono-1024.png'));

  // Validate that the standalone SVG is renderable by Chromium.
  await renderSvg(path.join(webIconsDir, 'icon-light.svg'), path.join(repoRoot, 'artifacts', 'icon-light-preview.png'), 1024);

  console.log(`Generated BaristaChaw icons from ${sourcePath}`);
  console.log(`Web icons: ${webIconsDir}`);
  console.log(`iOS prep assets: ${iosPrepDir}`);
}

await main();
