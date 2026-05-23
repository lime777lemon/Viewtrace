// 黒背景の JPEG ロゴを、暗い画素を透過化した PNG に変換するワンショット用スクリプト。
// 用途:
//   - 明背景用（既存の深緑のまま）: `node scripts/prepare-brand-logo.mjs <input> <output.png>`
//   - 暗背景用（白に置き換え）   : `node scripts/prepare-brand-logo.mjs <input> <output.png> --variant=light`
import sharp from "sharp";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const variantArg =
  args.find((a) => a.startsWith("--variant="))?.split("=")[1]?.trim() || "dark";
const positional = args.filter((a) => !a.startsWith("--"));
const [inputArg, outputArg] = positional;

if (!inputArg || !outputArg) {
  console.error("usage: node scripts/prepare-brand-logo.mjs <input> <output> [--variant=dark|light]");
  process.exit(1);
}

if (variantArg !== "dark" && variantArg !== "light") {
  console.error(`unknown variant: ${variantArg} (must be 'dark' or 'light')`);
  process.exit(1);
}

const input = resolve(inputArg);
const output = resolve(outputArg);

/** 明度がこの値より暗い画素は完全に透過。
 * フェザリング用に `featherMax` までは線形にアルファを上げる。 */
const ALPHA_MIN_BRIGHTNESS = 40;
const ALPHA_FEATHER_MAX = 110;

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

if (info.channels !== 4) {
  console.error("unexpected channels:", info.channels);
  process.exit(1);
}

const pixels = Buffer.from(data);
for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  const brightness = Math.max(r, g, b);

  // アルファ算出: 黒は完全透過、しきい値間は線形フェザリング
  let alpha = 255;
  if (brightness <= ALPHA_MIN_BRIGHTNESS) {
    alpha = 0;
  } else if (brightness < ALPHA_FEATHER_MAX) {
    const t =
      (brightness - ALPHA_MIN_BRIGHTNESS) / (ALPHA_FEATHER_MAX - ALPHA_MIN_BRIGHTNESS);
    alpha = Math.round(t * 255);
  }

  if (variantArg === "light") {
    // 暗背景用: 残った非透過部を白に統一（深緑→白に "色だけ" 反転）
    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
  }
  pixels[i + 3] = alpha;
}

await sharp(pixels, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(output);

console.log(`wrote ${output} (${info.width}x${info.height}, variant=${variantArg})`);
