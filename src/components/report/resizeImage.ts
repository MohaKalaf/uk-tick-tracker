import { MAX_IMAGE_BYTES } from "@/lib/report";

const MAX_SIDE = 1600;

// Phone photos are often 5-10 MB. Shrinking in the browser keeps uploads fast and
// under the server's 2 MB limit, and re-encoding drops EXIF data such as GPS.
export async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= MAX_IMAGE_BYTES) return blob;
  }
  throw new Error("This photo is too large even after resizing. Please choose a smaller one.");
}
