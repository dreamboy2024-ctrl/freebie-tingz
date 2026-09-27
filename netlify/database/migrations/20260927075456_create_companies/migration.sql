CREATE TABLE "companies" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"item" text NOT NULL,
	"category" text NOT NULL,
	"carrier" text,
	"ship_date" timestamp NOT NULL,
	"received" boolean DEFAULT false NOT NULL,
	"blacklisted" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
