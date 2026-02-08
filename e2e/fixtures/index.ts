/**
 * Combined Fixtures
 *
 * Merges all fixtures into a single test instance.
 */
import { mergeTests } from "@playwright/test";
import { test as authTest, expect } from "./auth.fixture";
import { test as dbTest } from "./database.fixture";

export const test = mergeTests(authTest, dbTest);
export { expect };
