import { getColorName } from "@/lib/color-names";

export type ImagePaletteColor = {
  hex: string;
  name: string;
  percentage: number;
};

type ColorBucket = { red: number; green: number; blue: number; count: number };

function toHex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
}

function colorDistance(left: ColorBucket, right: ColorBucket): number {
  const red = left.red / left.count - right.red / right.count;
  const green = left.green / left.count - right.green / right.count;
  const blue = left.blue / left.count - right.blue / right.count;
  return Math.sqrt(red * red + green * green + blue * blue);
}

export async function extractImagePalette(
  imageUrl: string,
  colorCount = 5,
): Promise<ImagePaletteColor[]> {
  const optimizedUrl = `/_next/image?url=${encodeURIComponent(imageUrl)}&w=96&q=75`;
  const response = await fetch(optimizedUrl);
  if (!response.ok) return [];

  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 72;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    return [];
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Map<number, ColorBucket>();
  for (let index = 0; index < pixels.length; index += 16) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const alpha = pixels[index + 3];
    if (alpha < 200) continue;
    const lightness = (Math.max(red, green, blue) + Math.min(red, green, blue)) / 2;
    if (lightness < 10 || lightness > 247) continue;
    const key = ((red >> 5) << 6) | ((green >> 5) << 3) | (blue >> 5);
    const bucket = buckets.get(key) ?? { red: 0, green: 0, blue: 0, count: 0 };
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const selected: ColorBucket[] = [];
  for (const bucket of [...buckets.values()].sort((a, b) => b.count - a.count)) {
    if (selected.every((color) => colorDistance(color, bucket) >= 48)) selected.push(bucket);
    if (selected.length === colorCount) break;
  }
  const total = selected.reduce((sum, bucket) => sum + bucket.count, 0);
  return selected.map((bucket) => {
    const hex = `#${toHex(bucket.red / bucket.count)}${toHex(bucket.green / bucket.count)}${toHex(bucket.blue / bucket.count)}`.toUpperCase();
    return {
      hex,
      name: getColorName(hex),
      percentage: total ? Number(((bucket.count / total) * 100).toFixed(1)) : 0,
    };
  });
}
