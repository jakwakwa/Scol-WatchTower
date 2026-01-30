import { NextRequest, NextResponse } from "next/server";
import { getDatabaseClient } from "@/app/utils";
import { leads, workflows } from "@/db/schema";
import { inngest } from "@/inngest";
import { z } from "zod";

// Schema for incoming Google Form data
const leadCaptureSchema = z.object({
	companyName: z.string().min(1, "Company name is required"),
	contactName: z.string().min(1, "Contact name is required"),
	email: z.string().email("Invalid email address"),
	phone: z.string().optional(),
	industry: z.string().optional(),
	employeeCount: z.coerce.number().optional(),
	estimatedVolume: z.string().optional(),
	secret: z.string().min(1, "Secret is required"), // Shared secret for auth
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// 1. Validation
		const validation = leadCaptureSchema.safeParse(body);
		if (!validation.success) {
			return NextResponse.json(
				{
					error: "Validation failed",
					details: validation.error.flatten().fieldErrors,
				},
				{ status: 400 },
			);
		}

		const data = validation.data;

		// 2. Auth Check (Simple Shared Secret)
		const expectedSecret =
			process.env.GAS_WEBHOOK_SECRET ||
			process.env.CRON_SECRET ||
			"temp_dev_secret";
		if (data.secret !== expectedSecret) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const db = await getDatabaseClient();
		if (!db) {
			return NextResponse.json(
				{ error: "Database connection failed" },
				{ status: 500 },
			);
		}

		// 3. Create Lead
		// Returning * is supported in Postgres/SQLite via Drizzle
		const [newLead] = await db
			.insert(leads)
			.values([
				{
					companyName: data.companyName,
					contactName: data.contactName,
					email: data.email,
					phone: data.phone,
					industry: data.industry,
					employeeCount: data.employeeCount,
					mandateVolume: data.estimatedVolume
						? parseInt(data.estimatedVolume.toString().replace(/[^0-9]/g, ""))
						: 0,
					status: "new",
				},
			])
			.returning();

		if (!newLead) {
			throw new Error("Failed to create lead record");
		}

		// 4. Create Workflow
		const [newWorkflow] = await db
			.insert(workflows)
			.values([
				{
					leadId: newLead.id,
					stage: 1,
					status: "pending",
				},
			])
			.returning();

		if (!newWorkflow) {
			throw new Error("Failed to create workflow record");
		}

		// 5. Trigger Inngest
		// We use the existing 'onboarding/started' event which expects { leadId, workflowId }
		await inngest.send({
			name: "onboarding/lead.created",
			data: {
				leadId: newLead.id,
				workflowId: newWorkflow.id,
			},
		});

		return NextResponse.json(
			{
				success: true,
				leadId: newLead.id,
				workflowId: newWorkflow.id,
				message: "Lead captured and workflow started",
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Error in lead-capture webhook:", error);
		const message = error instanceof Error ? error.message : "Unexpected error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
