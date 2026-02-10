import { serve } from "inngest/next";
import { functions, inngest } from "@/inngest";

// Validate that all function imports resolved (catches silent import failures at build time)
const validFunctions = functions.filter(Boolean);
if (validFunctions.length !== functions.length) {
	console.error(
		`[inngest/route] WARNING: ${functions.length - validFunctions.length} function(s) resolved to undefined — check imports.`
	);
}

const handler = serve({
	client: inngest,
	functions: validFunctions,
	signingKey: process.env.INNGEST_SIGNING_KEY,
});

export const { GET, POST, PUT } = handler;
