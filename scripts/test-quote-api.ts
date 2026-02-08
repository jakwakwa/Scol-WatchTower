#!/usr/bin/env bun

/**
 * Test script for /api/quotes endpoint
 * Simulates external webhook payload from Gemini AI
 */

const API_URL = "http://localhost:3000/api/quotes";

// Sample payload matching external workflow output
const testPayload = {
	workflowId: 3,
	amount: 750000, // $7,500 in cents
	baseFeePercent: 150, // 1.50% in basis points
	adjustedFeePercent: 200, // 2.00% in basis points (risk-adjusted)
	generatedBy: "gemini",
};

async function testQuoteCreation() {
	try {
		const response = await fetch(API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(testPayload),
		});

		const data = await response.json();

		if (response.ok) {
		} else {
			if (data.details) {
			}
		}
	} catch (error) {
		console.error("❌ Test FAILED with error:");
		console.error(error);
	}
}

// Run the test
testQuoteCreation();
