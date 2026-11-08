CREATE TABLE "groups" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "plan_days" (
	"id" serial PRIMARY KEY,
	"student_id" integer NOT NULL,
	"day_number" integer NOT NULL,
	"date" date NOT NULL,
	"new_memorization" text DEFAULT '' NOT NULL,
	"review" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"group_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "supervisors" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"group_id" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "plan_days_student_day_idx" ON "plan_days" ("student_id","day_number");--> statement-breakpoint
CREATE INDEX "plan_days_date_idx" ON "plan_days" ("date");--> statement-breakpoint
CREATE INDEX "plan_days_status_idx" ON "plan_days" ("status");--> statement-breakpoint
ALTER TABLE "plan_days" ADD CONSTRAINT "plan_days_student_id_students_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id");--> statement-breakpoint
ALTER TABLE "supervisors" ADD CONSTRAINT "supervisors_group_id_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id");