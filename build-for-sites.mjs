import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const appDir = root;
const outDir = path.join(root, "dist", "server");

const textAssets = [
  ["index.html", "text/html; charset=utf-8"],
  ["styles.css", "text/css; charset=utf-8"],
  ["app-data.js", "text/javascript; charset=utf-8"],
  ["app.js", "text/javascript; charset=utf-8"],
  ["manifest.json", "application/manifest+json; charset=utf-8"],
  ["sw.js", "text/javascript; charset=utf-8"],
  ["README.md", "text/markdown; charset=utf-8"]
];

const binaryAssets = [
  ["icons/icon-192.png", "image/png"],
  ["icons/icon-512.png", "image/png"]
];

const textMap = {};
for (const [assetPath, contentType] of textAssets) {
  textMap[`/${assetPath}`] = {
    contentType,
    body: await readFile(path.join(appDir, assetPath), "utf8")
  };
}
textMap["/"] = textMap["/index.html"];

const binaryMap = {};
for (const [assetPath, contentType] of binaryAssets) {
  binaryMap[`/${assetPath}`] = {
    contentType,
    body: (await readFile(path.join(appDir, assetPath))).toString("base64")
  };
}

const worker = `const TEXT_ASSETS = ${JSON.stringify(textMap)};
const BINARY_ASSETS = ${JSON.stringify(binaryMap)};

function headers(contentType) {
  return {
    "content-type": contentType,
    "cache-control": contentType.startsWith("text/html")
      ? "no-cache"
      : "public, max-age=3600"
  };
}

function decodeBase64(value) {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname.endsWith("/") && url.pathname !== "/"
      ? url.pathname.slice(0, -1)
      : url.pathname;
    const textAsset = TEXT_ASSETS[pathname] || TEXT_ASSETS[\`/\${pathname.split("/").pop() || "index.html"}\`];
    if (textAsset) {
      return new Response(textAsset.body, { headers: headers(textAsset.contentType) });
    }
    const binaryAsset = BINARY_ASSETS[pathname];
    if (binaryAsset) {
      return new Response(decodeBase64(binaryAsset.body), { headers: headers(binaryAsset.contentType) });
    }
    return new Response(TEXT_ASSETS["/index.html"].body, {
      status: 200,
      headers: headers(TEXT_ASSETS["/index.html"].contentType)
    });
  }
};
`;

await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, "index.js"), worker);
