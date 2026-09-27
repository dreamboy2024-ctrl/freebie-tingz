import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { companies } from "../../db/schema.js";

export default async (req: Request) => {
  if (req.method === "GET") {
    const all = await db.select().from(companies).orderBy(companies.createdAt);
    return Response.json(all);
  }

  if (req.method === "POST") {
    const body = await req.json();
    const { name, item, category, carrier, shipDate } = body;

    if (!name || !item || !category || !shipDate) {
      return Response.json(
        { error: "name, item, category, and shipDate are required" },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(companies)
      .values({
        name,
        item,
        category,
        carrier: carrier || null,
        shipDate: new Date(shipDate),
      })
      .returning();

    return Response.json(created, { status: 201 });
  }

  if (req.method === "PATCH") {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) {
      return Response.json({ error: "id query param is required" }, { status: 400 });
    }

    const body = await req.json();
    const updates: Partial<typeof companies.$inferInsert> = {};
    if (typeof body.received === "boolean") updates.received = body.received;
    if (typeof body.blacklisted === "boolean") updates.blacklisted = body.blacklisted;
    if (typeof body.notes === "string") updates.notes = body.notes;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "no valid fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, id))
      .returning();

    if (!updated) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    return Response.json(updated);
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id"));
    if (!id) {
      return Response.json({ error: "id query param is required" }, { status: 400 });
    }

    await db.delete(companies).where(eq(companies.id, id));
    return new Response(null, { status: 204 });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/companies",
};
