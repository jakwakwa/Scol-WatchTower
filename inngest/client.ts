import { Inngest, EventSchemas } from "inngest";
import type { Events } from "./events";

/**
 * Inngest client for workflow orchestration
 * @see https://www.inngest.com/docs/reference/client
 */
export const inngest = new Inngest({
	id: "stratcol-onboard",
	schemas: new EventSchemas().fromRecord<Events>(),
});
