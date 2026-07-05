/**
 * Les ei bildefil, nedskaler til maks kantlengd og re-enkod som JPEG.
 * Returnerer base64 (utan data-URL-prefiks) + mimeType. Held opplastinga lita
 * så det multimodale AI-kallet blir raskt og rimeleg.
 */
export async function fileToDownscaledBase64(
  file: File,
  maxEdge = 1600,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Klarte ikkje å lese fila.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Klarte ikkje å tolke bildet.'));
    image.src = dataUrl;
  });

  let { width, height } = img;
  const longest = Math.max(width, height);
  if (longest > maxEdge) {
    const scale = maxEdge / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Klarte ikkje å behandle bildet.');
  // Kvit bakgrunn for gjennomsiktige PNG-ar (JPEG har ikkje alfa).
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const mimeType = 'image/jpeg';
  const out = canvas.toDataURL(mimeType, quality);
  return { base64: out.split(',')[1] || '', mimeType };
}
