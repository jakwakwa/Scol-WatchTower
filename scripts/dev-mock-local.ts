#!/usr/bin/env bun

import "../envConfig";

const DEFAULT_MOCK_DATABASE_URL =
	"postgresql://postgres:postgres@localhost:5434/controltower_mock";

function run(command: string, env?: Record<string, string>) {
	const proc = Bun.spawn(command.split(" "), {
		cwd: process.cwd(),
		stdio: ["inherit", "inherit", "inherit"],
		env: {
			...process.env,
			...env,
		},
	});

	return proc.exited;
}

async function main() {
	const mockDatabaseUrl = process.env.MOCK_DATABASE_URL || DEFAULT_MOCK_DATABASE_URL;

	console.info("🚀 Starting local mock manual-testing environment...");
	console.info(`Using mock DB: ${mockDatabaseUrl}`);

	let exitCode = await run("docker compose up -d mock_db");
	if (exitCode !== 0) {
		process.exit(exitCode ?? 1);
	}

	exitCode = await run("bun run mock:db:bootstrap", {
		MOCK_DATABASE_URL: mockDatabaseUrl,
	});
	if (exitCode !== 0) {
		process.exit(exitCode ?? 1);
	}

	exitCode = await run("bun run mock:db:verify", {
		MOCK_DATABASE_URL: mockDatabaseUrl,
	});
	if (exitCode !== 0) {
		process.exit(exitCode ?? 1);
	}

	console.info("🌐 Launching Next.js dev server with mock DB enabled...");
	console.info("Stop this process with Ctrl+C when manual testing is finished.");

	exitCode = await run("bun run dev", {
		ENABLE_LOCAL_MOCK_ENV: "true",
		MOCK_DATABASE_URL: mockDatabaseUrl,
	});

	process.exit(exitCode ?? 0);
}

main().catch(error => {
	console.error("❌ Failed to start local mock manual-testing environment:", error);
	process.exit(1);
});