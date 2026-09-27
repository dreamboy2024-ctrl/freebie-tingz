import type { Config } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

const CATEGORIES = [
  "Skincare & Beauty",
  "Food & Beverage",
  "Household Goods",
  "Health & Medical",
  "Pet Supplies",
  "Other",
];

const anthropic = new Anthropic();

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { name, item } = await req.json();

  if (!name || !item) {
    return Response.json({ error: "name and item are required" }, { status: 400 });
  }

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `A logistics tracker is receiving a free sample entry: company "${name}", item "${item}".
Pick the single best-fitting category from this exact list: ${CATEGORIES.join(", ")}.
Also write one short, plain sentence (under 20 words) noting anything worth watching for this shipment (or a neutral note if nothing stands out).
Respond with ONLY compact JSON in the form {"category": "...", "notes": "..."}. No markdown, no extra text.`,
      },
    ],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text : "";

  let parsed: { category?: string; notes?: string } = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = {};
  }

  const category = CATEGORIES.includes(parsed.category ?? "") ? parsed.category : "Other";
  const notes = typeof parsed.notes === "string" ? parsed.notes.slice(0, 280) : "";

  return Response.json({ category, notes });
};

export const config: Config = {
  path: "/api/ai-generate",
};
