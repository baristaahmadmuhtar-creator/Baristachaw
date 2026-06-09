import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const url = "https://expo.dev/artifacts/eas/ozD3mc3H3BhN29bhZ7hbFb.apk";
const targetDir = "./artifacts/android-release";
const targetPath = `${targetDir}/baristachaw-android.apk`;

console.log(`Downloading APK from: ${url}`);
fs.mkdirSync(targetDir, { recursive: true });

function download(sourceUrl, path, redirects = 0) {
  if (redirects > 5) throw new Error('Too many redirects while downloading APK');
  const parsed = new URL(sourceUrl);
  const client = parsed.protocol === 'http:' ? http : https;

  return new Promise((resolve, reject) => {
    const request = client.get(parsed, (response) => {
      const status = response.statusCode || 0;
      const location = response.headers.location;
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        response.resume();
        resolve(download(new URL(location, parsed).toString(), path, redirects + 1));
        return;
      }
      if (status >= 400) {
        response.resume();
        reject(new Error(`Failed to download APK: HTTP ${status}`));
        return;
      }

      const file = fs.createWriteStream(path);
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    });
    request.on('error', reject);
  });
}

download(url, targetPath)
  .then(() => {
    console.log(`Download completed successfully! Saved to: ${targetPath}`);
    const stats = fs.statSync(targetPath);
    console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  })
  .catch((error) => {
    console.error("Download failed:", error);
    process.exit(1);
  });
