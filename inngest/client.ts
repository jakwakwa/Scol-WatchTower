import { EventSchemas, Inngest } from "inngest";
import type { Events } from "./events";

/**
 * Inngest client for workflow orchestration
 * @see https://www.inngest.com/docs/reference/client
 */
export const inngest = new Inngest({
	id: "stratcol-onboard",
	eventKey: process.env.INNGEST_EVENT_KEY,
	schemas: new EventSchemas().fromRecord<Events>(),
});
