import { getDatabaseClient } from "@/app/utils";
import { notifications } from "@/db/schema";
import { NextResponse } from "next/server";

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
export async function POST() {
	const db = getDatabaseClient();
	if (!db) {
		return NextResponse.json({ error: "Database not available" }, { status: 500 });
	}

	try {
		await db.update(notifications).set({ read: true });

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to mark all notifications read:", error);
		return NextResponse.json(
			{ error: "Failed to update notifications" },
			{ status: 500 }
		);
	}
}
