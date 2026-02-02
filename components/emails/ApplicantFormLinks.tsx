import { Button, Heading, Hr, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./EmailLayout";

export interface FormLink {
	formType: string;
	url: string;
}

interface ApplicantFormLinksProps {
	contactName?: string;
	links: FormLink[];
}

export const ApplicantFormLinks = ({
	contactName = "Valued Client",
	links = [],
}: ApplicantFormLinksProps) => {
	const previewText = "Action Required: Complete your onboarding forms";

	return (
		<EmailLayout preview={previewText}>
			<Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
				Welcome to StratCol
			</Heading>
			<Text className="text-black text-[14px] leading-[24px]">Hello {contactName},</Text>
			<Text className="text-black text-[14px] leading-[24px]">
				We're excited to have you on board. To complete your application, please fill out
				the following forms and upload the necessary documents.
			</Text>
			<Section className="text-center mt-[32px] mb-[32px]">
				{links.map((link, index) => (
					<div key={index} className="mb-4">
						<Button
							className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
							href={link.url}>
							Complete: {formatFormType(link.formType)}
						</Button>
					</div>
				))}
			</Section>
			<Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
			<Text className="text-[#666666] text-[12px] leading-[24px]">
				If you have any questions, please reply to this email or contact your account
				manager.
			</Text>
		</EmailLayout>
	);
};

function formatFormType(type: string) {
	return type
		.toLowerCase()
		.split("_")
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

export default ApplicantFormLinks;
