/**
 * Inngest API Route Handler
 * Serves all Inngest functions and handles event ingestion
 */
import { serve } from "inngest/next";
import { inngest, functions } from "@/inngest";

const handler = serve({
	client: inngest,
	functions,
});

export const { GET, POST, PUT } = handler;
