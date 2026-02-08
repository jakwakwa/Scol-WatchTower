import { getDatabaseClient } from "@/app/utils";
import { notifications } from "@/db/schema";
import { NextResponse } from "next/server";

/**
 * DELETE /api/notifications/clear-all
 * Clear all notifications
 */
export async function DELETE() {
	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json({ error: "Database not available" }, { status: 500 });
	}

	try {
		await db.delete(notifications);

		return NextResponse.json({
			success: true,
			message: "All notifications cleared",
		});
	} catch (error) {
		console.error("Failed to clear all notifications:", error);
		return NextResponse.json({ error: "Failed to clear notifications" }, { status: 500 });
	}
}
