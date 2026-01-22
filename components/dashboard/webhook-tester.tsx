"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { RiFlaskLine } from "@remixicon/react";
import { testAgentWebhook } from "@/app/actions/test-webhook";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export function WebhookTester() {
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<any>(null);
	const [eventType, setEventType] = useState("LEAD_CAPTURED");

	const handleTest = async () => {
		setIsLoading(true);
		setResult(null);
		try {
			const response = await testAgentWebhook(eventType);
			setResult(response);
		} catch (error) {
			setResult({ success: false, message: "Client-side error" });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="gap-2 border-dashed">
					<RiFlaskLine className="h-4 w-4" />
					Test Webhook
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Test external Webhook</DialogTitle>
					<DialogDescription>
						Send a test event to your configured external hook (if set in .env).
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4 py-4">
					<div className="flex flex-col gap-2">
						<label className="text-sm font-medium">Event Type</label>
						<Select value={eventType} onValueChange={setEventType}>
							<SelectTrigger>
								<SelectValue placeholder="Select Event" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="LEAD_CAPTURED">
									LEAD_CAPTURED (Kickoff)
								</SelectItem>
								<SelectItem value="QUOTATION_GENERATED">
									QUOTATION_GENERATED
								</SelectItem>
								<SelectItem value="RISK_VERIFICATION_REQUESTED">
									RISK_VERIFICATION_REQUESTED
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="text-sm text-muted-foreground">
						Configuration Check:
						<br />- Event: <strong>{eventType}</strong>
						<br />- Lead ID: <strong>123</strong> (Test)
					</div>

					<Button onClick={handleTest} disabled={isLoading}>
						{isLoading ? "Sending..." : "Send Test Event"}
					</Button>

					{result && (
						<div
							className={`p-3 rounded-md text-sm font-mono overflow-auto max-h-[200px] border ${
								result.success
									? "bg-green-50 text-green-700 border-green-200"
									: "bg-red-50 text-red-700 border-red-200"
							}`}
						>
							<div className="font-bold mb-1">
								{result.success ? "Success" : "Error"}
							</div>
							<div>{result.message}</div>
							{result.data && (
								<pre className="mt-2 text-xs">
									{JSON.stringify(result.data, null, 2)}
								</pre>
							)}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
