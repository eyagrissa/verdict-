import { z } from "zod";

export const runtime = "nodejs";

const ImageRequestSchema = z.object({
  prompt: z.string().trim().min(5).max(12_000),
  concept: z.string().trim().max(1_200).optional(),
}).strict();

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }

  const input = ImageRequestSchema.safeParse(body);
  if (!input.success) {
    return Response.json({ message: "Provide a brief between 5 and 12,000 characters." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ message: "AI image generation needs a GEMINI_API_KEY in the server's .env.local file." }, { status: 503 });
  }

  const concept = input.data.concept ? `\nVisual direction from the selected model: ${input.data.concept}` : "";
  const prompt = [
    `Create an original, polished logo illustration for this brand brief: ${input.data.prompt}`,
    concept,
    "Return a clean square logo artwork, not a photograph of a logo, not a product mockup, not a poster or page layout. Make the central symbol visually distinctive, vibrant, memorable, and immediately readable at small sizes. Use expressive original shapes, considered lighting and color, crisp edges, and generous breathing room. No surrounding scene, no paper, no border, no watermark, no explanatory text, and no generic clip-art. Keep the background transparent if supported; otherwise use a solid pale neutral background.",
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        model: process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image",
        input: [{ type: "text", text: prompt }],
        store: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Gemini image API returned HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
    }

    const result: unknown = await response.json();
    const image = findGeneratedImage(result);
    if (!image) {
      throw new Error("Gemini returned no image. Check image-model access for this API key.");
    }
    if (image.data.length > 20_000_000) {
      throw new Error("Gemini's generated image is too large to send to the browser.");
    }
    if (image.mimeType !== "image/png" || !isPngData(image.data)) {
      throw new Error("Gemini did not return a valid PNG image.");
    }
    return Response.json({ imageBase64: image.data, mimeType: image.mimeType });
  } catch (error) {
    const message = controller.signal.aborted
      ? "Gemini image generation timed out. Please try again."
      : error instanceof Error ? error.message : "Gemini image generation failed.";
    return Response.json({ message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

function findGeneratedImage(value: unknown): { data: string; mimeType: string } | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if ("output_image" in value) {
    const image = parseImageOutput(value.output_image);
    if (image) {
      return image;
    }
  }
  if ("outputs" in value && Array.isArray(value.outputs)) {
    for (const output of value.outputs) {
      const image = parseImageOutput(output);
      if (image) {
        return image;
      }
    }
  }
  return null;
}

function parseImageOutput(value: unknown): { data: string; mimeType: string } | null {
  if (!value || typeof value !== "object" || !("data" in value) || typeof value.data !== "string") {
    return null;
  }
  const mimeType = "mime_type" in value && typeof value.mime_type === "string"
    ? value.mime_type
    : "mimeType" in value && typeof value.mimeType === "string" ? value.mimeType : "";
  return /^image\/(?:png|jpeg|webp)$/.test(mimeType) && /^[A-Za-z0-9+/]+={0,2}$/.test(value.data)
    ? { data: value.data, mimeType }
    : null;
}

function isPngData(data: string): boolean {
  const bytes = Buffer.from(data, "base64");
  return bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a;
}
