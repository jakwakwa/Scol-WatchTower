"use server";

export async function testZapierWebhook(eventType: string = "LEAD_CAPTURED") {
	// 1. Check if testing is enabled
	if (process.env.TEST_HOOK !== "1") {
		return {
			success: false,
			message:
				"Webhook testing is disabled. Set TEST_HOOK=1 in .env to enable.",
		};
	}

	// 2. Get the specific webhook URL based on event type
	let webhookUrl = process.env.WEBHOOK_ZAP_MANDATE_KICKOFF_TRIGGER;

	if (eventType === "QUOTATION_GENERATED") {
		webhookUrl = process.env.WEBHOOK_ZAP_QUOTATION_TRIGGER;
	} else if (eventType === "RISK_VERIFICATION_REQUESTED") {
		webhookUrl = process.env.WEBHOOK_ZAP_RISK_ASSESSMENT_TRIGGER;
	}

	if (!webhookUrl) {
		return {
			success: false,
			message: `Webhook URL for ${eventType} is not set in .env`,
		};
	}

	try {
		// 3. Send a test payload
		// Construct payload based on event type to match real Temporal activities
		let payload: any = {
			event: eventType,
			leadId: 123,
			workflowId: 456,
			stage: eventType === "LEAD_CAPTURED" ? 1 : 2,
			isTest: true,
			timestamp: new Date().toISOString(),
			// Simulated enriched data
			companyName: "Hoërskool Moreleta Park",
			contactName: "Kobus Hartman",
			email: "[EMAIL_ADDRESS]",
			phone: "082 333 4444",
			country: "ZA",
			estimatedVolume: "R 1 200 000",
		};

		if (eventType === "QUOTATION_GENERATED") {
			payload.quote = {
				quoteId: "Q-TEST-123",
				amount: 150000,
				terms: "Standard 30-day payment terms",
			};
		} else if (eventType === "RISK_VERIFICATION_REQUESTED") {
			payload.aiResult = {
				riskScore: 85,
				anomalies: ["Suspicious transaction volume"],
				recommendedAction: "MANUAL_REVIEW",
			};
		}

		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		// 4. Handle response
		const responseText = await response.text();
		let responseData;
		try {
			responseData = JSON.parse(responseText);
		} catch (e) {
			responseData = responseText;
		}

		if (!response.ok) {
			return {
				success: false,
				message: `Zapier returned error: ${response.status} ${response.statusText}`,
				data: responseData,
			};
		}

		return {
			success: true,
			message: "Webhook sent successfully!",
			data: responseData,
		};
	} catch (error) {
		console.error("Test Webhook Error:", error);
		return {
			success: false,
			message:
				error instanceof Error ? error.message : "Unknown error occurred",
		};
	}
}
