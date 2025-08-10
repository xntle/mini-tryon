import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      image_url,
      prompt,
      resolution = "720p",
      aspect_ratio = "auto",
    } = body;
    if (!image_url)
      return NextResponse.json(
        { error: "image_url required" },
        { status: 400 }
      );

    const result = await fal.subscribe(
      "fal-ai/wan/v2.2-a14b/image-to-video/turbo",
      {
        input: { image_url, prompt, resolution, aspect_ratio },
        logs: true,
      }
    );

    return NextResponse.json({
      videoUrl: result?.data?.video?.url,
      prompt: result?.data?.prompt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "FAL i2v failed" }, { status: 500 });
  }
}
