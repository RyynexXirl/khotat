CREATE TABLE "muhaffizeen" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "subgroup" text;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "password" text DEFAULT '1234' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "muhaffiz_id" integer;--> statement-breakpoint
ALTER TABLE "supervisors" ADD COLUMN "password" text DEFAULT '1234' NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_muhaffiz_id_muhaffizeen_id_fkey" FOREIGN KEY ("muhaffiz_id") REFERENCES "muhaffizeen"("id") ON DELETE SET NULL;--> statement-breakpoint
-- Remove the demo accounts (keep the groups and the Sheikh's password-only login).
DELETE FROM "plan_days";--> statement-breakpoint
DELETE FROM "students";--> statement-breakpoint
DELETE FROM "supervisors";