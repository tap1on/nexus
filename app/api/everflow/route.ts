import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/api";
import { fetchTimezones } from "@/lib/everflow";

const CreateInstance = z.object({
  name: z.string().min(1),
  apiKey: z.string().min(10),
});

export async function POST(req: Request) {
  return adminRoute(async () => {
    const body = CreateInstance.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json(
        { error: body.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    // Validate the key and resolve the Europe/Berlin timezone id live.
    let timezoneId = 56; // documented value for Europe/Berlin
    try {
      const tzs = await fetchTimezones(body.data.apiKey);
      const berlin = tzs.find((t) => t.timezone === "Europe/Berlin");
      if (berlin) timezoneId = berlin.timezone_id;
    } catch (e) {
      return NextResponse.json(
        {
          error: `API key validation failed: ${e instanceof Error ? e.message : e}`,
        },
        { status: 400 }
      );
    }
    const inst = await db.everflowInstance.create({
      data: { ...body.data, timezoneId },
    });
    return NextResponse.json({ id: inst.id, timezoneId });
  });
}
