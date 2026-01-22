import { getDatabaseClient } from "@/app/utils";
import { notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const notificationId = parseInt(id);

	if (isNaN(notificationId)) {
		return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
	}

	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json(
			{ error: "Database not available" },
			{ status: 500 },
		);
	}

	try {
		await db
			.update(notifications)
			.set({ read: true })
			.where(eq(notifications.id, notificationId));

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to mark notification read:", error);
		return NextResponse.json(
			{ error: "Failed to update notification" },
			{ status: 500 },
		);
	}
}
