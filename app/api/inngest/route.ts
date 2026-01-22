import { serve } from "inngest/next";
import { functions, inngest } from "@/inngest";

const handler = serve({
	client: inngest,
	functions,
	signingKey: process.env.INNGEST_SIGNING_KEY,
});

export const { GET, POST, PUT } = handler;
