/**
 * Inngest API Route Handler
 * Serves all Inngest functions and handles event ingestion
 */
import { serve } from "inngest/next";
import { inngest, functions } from "@/inngest";

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions,
});
