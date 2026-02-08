import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/protected(.*)"]);

export default clerkMiddleware(async (auth, req) => {
	// E2E Test Mode Bypass - Skip Clerk auth when test cookie is present
	const isE2ETestMode = req.cookies.get("__e2e_test_mode")?.value === "true";
	if (isE2ETestMode) {
		// Allow request to proceed without Clerk auth
		return NextResponse.next();
	}

	if (isProtectedRoute(req)) {
		const { userId, redirectToSignIn } = await auth();
		if (!userId) return redirectToSignIn();
	}
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
