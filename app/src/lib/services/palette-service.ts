const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export interface ColorEntry {
  hex: string;
  hsl: [number, number, number];
  percentage: number;
}

export interface PaletteResponse {
  movie_id: number;
  palette: ColorEntry[];
  dominant_color: string;
}

export async function extractPalette(movieId: number, imageUrls: string[]): Promise<PaletteResponse> {
  const response = await fetch(`${PYTHON_SERVICE_URL}/extract-palette`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ movie_id: movieId, image_urls: imageUrls }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Palette extraction failed: ${error.detail || response.statusText}`);
  }

  return response.json();
}
