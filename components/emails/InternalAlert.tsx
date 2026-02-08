import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./EmailLayout";

interface InternalAlertProps {
	title: string;
	message: string;
	workflowId: number;
	applicantId: number;
	type?: "info" | "warning" | "error" | "success";
	details?: Record<string, unknown>;
	actionUrl?: string;
}

export const InternalAlert = ({
	title,
	message,
	workflowId,
	applicantId,
	type = "info",
	details,
	actionUrl,
}: InternalAlertProps) => {
	const color =
		type === "error"
			? "#e11d48"
			: type === "warning"
				? "#f59e0b"
				: type === "success"
					? "#10b981"
					: "#3b82f6";

	// Default dashboard URL if not provided
	const dashboardUrl =
		actionUrl ||
		`https://stratcol-onboard-ai.vercel.app/dashboard/applicants/${applicantId}`;

	return (
		<EmailLayout preview={`Internal Alert: ${title}`}>
			<Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
				Workflow Alert
			</Heading>
			<Section
				className="rounded-lg p-4 mb-6 text-center"
				style={{ backgroundColor: `${color}20`, border: `1px solid ${color}` }}>
				<Text className="font-bold text-[18px] m-0" style={{ color: color }}>
					{title}
				</Text>
			</Section>

			<Text className="text-black text-[14px] leading-[24px]">
				<strong>Workflow ID:</strong> {workflowId}
				<br />
				<strong>Applicant ID:</strong> {applicantId}
			</Text>

			<Text className="text-black text-[14px] leading-[24px]">{message}</Text>

			{details && Object.keys(details).length > 0 && (
				<Section className="bg-gray-100 p-4 rounded-md my-4">
					<Text className="font-bold mb-2">Details:</Text>
					{Object.entries(details).map(([key, value]) => (
						<Text key={key} className="text-[12px] m-0 font-mono">
							{key}: {String(value)}
						</Text>
					))}
				</Section>
			)}

			<Section className="text-center mt-[32px] mb-[32px]">
				<Button
					className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
					href={dashboardUrl}>
					View in Dashboard
				</Button>
			</Section>
		</EmailLayout>
	);
};

export default InternalAlert;
