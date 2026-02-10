import { createTestVendor, getVendorResults } from "../lib/procurecheck";

async function runTest() {
	try {
		// 1. Create Vendor (Sandbox)
		// Using a fake applicant ID and random suffix to avoid "already exists" if any
		const applicantId = 99999;
		const vendorName = "MODENA INFRASTRUCTURE"; // From docs
		const regNum = "2019/015639/07"; // From docs
		const creationResult = await createTestVendor({
			applicantId,
			vendorName,
			registrationNumber: regNum,
		});

		const vendorId = creationResult.ProcureCheckVendorID || creationResult.id;
		if (!vendorId) {
			console.error("-> No Vendor ID returned!");
			return;
		}
		const _results = await getVendorResults(vendorId);
	} catch (error) {
		console.error("-> Test Failed:", error);
	}
}

runTest();
