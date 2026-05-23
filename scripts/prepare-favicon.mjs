// 横長ブランドロゴ（黒背景 JPEG）からアイコン領域だけを取り出し、
// 白背景の正方形 PNG（favicon/apple-icon 用）として保存するワンショットスクリプト。
//
// 実行例:
//   node scripts/prepare-favicon.mjs \
//     "/path/to/source.png" \
//     src/app/icon.png \
//     --size=512 --crop-h=220 --inset=0.9 --radius=20
//
// オプション:
//   --size=512     出力する 1 辺のピクセル数（既定 512）
//   --crop-h=220   元画像から切り出すアイコン領域の高さ。既定 220（=およそ上半分）
//   --inset=0.9    キャンバスに対するアイコンの占有比（0〜1、長辺基準）
//   --radius=20    キャンバス角の丸み（% 指定。0=角丸なし、20=やや丸い、50=円）
import sharp from "sharp";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const [inputArg, outputArg] = positional;
const get = (name, fallback) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  if (!a) return fallback;
  const v = Number(a.split("=")[1]);
  return Number.isFinite(v) ? v : fallback;
};
const SIZE = get("size", 512);
const CROP_H = get("crop-h", 220);
const INSET = get("inset", 0.9);
const RADIUS_PCT = get("radius", 0);

if (!inputArg || !outputArg) {
  console.error("usage: node scripts/prepare-favicon.mjs <input> <output> [--size=512] [--crop-h=220] [--inset=0.9] [--radius=20]");
  process.exit(1);
}

const input = resolve(inputArg);
const output = resolve(outputArg);

// 1) 元画像のアイコン領域（上部）を切り出し、暗背景を透過化
const meta = await sharp(input).metadata();
const cropH = Math.min(CROP_H, meta.height ?? CROP_H);
const { data, info } = await sharp(input)
  .extract({ left: 0, top: 0, width: meta.width, height: cropH })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const ALPHA_MIN_BRIGHTNESS = 40;
const ALPHA_FEATHER_MAX = 110;
const pixels = Buffer.from(data);
for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  const brightness = Math.max(r, g, b);
  if (brightness <= ALPHA_MIN_BRIGHTNESS) {
    pixels[i + 3] = 0;
  } else if (brightness < ALPHA_FEATHER_MAX) {
    const t =
      (brightness - ALPHA_MIN_BRIGHTNESS) / (ALPHA_FEATHER_MAX - ALPHA_MIN_BRIGHTNESS);
    pixels[i + 3] = Math.round(t * 255);
  }
}

// 2) 透明化済みバッファをいったん PNG にして再ロード → trim でアイコンの余白除去
const transparentPng = await sharp(pixels, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toBuffer();

const iconBoxSide = Math.round(SIZE * INSET);
const iconResized = await sharp(transparentPng)
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 5 })
  .resize({
    width: iconBoxSide,
    height: iconBoxSide,
    fit: "inside",
    background: { r: 255, g: 255, b: 255, alpha: 0 },
  })
  .png()
  .toBuffer({ resolveWithObject: true });

// 3) 正方形・白背景のキャンバスにアイコンを中央配置
const left = Math.round((SIZE - iconResized.info.width) / 2);
const top = Math.round((SIZE - iconResized.info.height) / 2);

const composited = await sharp({
  create: {
    width: SIZE,
    height: SIZE,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([{ input: iconResized.data, left, top }])
  .png()
  .toBuffer();

// 4) 任意で角丸マスクを適用（SVG ベースの dest-in 合成）
if (RADIUS_PCT > 0) {
  const r = Math.round((SIZE * RADIUS_PCT) / 100);
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">` +
      `<rect width="${SIZE}" height="${SIZE}" rx="${r}" ry="${r}" fill="white"/>` +
      `</svg>`,
  );
  await sharp(composited)
    .composite([{ input: mask, blend: "dest-in" }])
    .png({ compressionLevel: 9 })
    .toFile(output);
} else {
  await sharp(composited).png({ compressionLevel: 9 }).toFile(output);
}

console.log(
  `wrote ${output} (${SIZE}x${SIZE}, icon=${iconResized.info.width}x${iconResized.info.height}, radius=${RADIUS_PCT}%)`,
);
