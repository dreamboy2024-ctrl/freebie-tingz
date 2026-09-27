import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: serial().primaryKey(),
  name: text().notNull(),
  item: text().notNull(),
  category: text().notNull(),
  carrier: text(),
  shipDate: timestamp("ship_date", { mode: "date" }).notNull(),
  received: boolean().notNull().default(false),
  blacklisted: boolean().notNull().default(false),
  notes: text(),
  createdAt: timestamp("created_at").defaultNow(),
});
