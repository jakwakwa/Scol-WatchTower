"use client";

import { useState } from "react";
import type { FormType } from "@/lib/types";
import FormRenderer from "@/components/forms/form-renderer";
import { formContent } from "./content";

interface FormViewProps {
	token: string;
	formType: Exclude<FormType, "DOCUMENT_UPLOADS">;
}

export default function FormView({ token, formType }: FormViewProps) {
	const [submitted, setSubmitted] = useState(false);
	const [submitMessage, setSubmitMessage] = useState<string | null>(null);
	const content = formContent[formType];

	if (submitted) {
		return (
			<div className="space-y-4 text-center">
				<h2 className="text-xl font-semibold text-foreground">Submission received</h2>
				<p className="text-sm text-muted-foreground">
					Thank you. Your form has been submitted successfully.
				</p>
				{submitMessage ? (
					<p className="text-xs text-muted-foreground">{submitMessage}</p>
				) : null}
			</div>
		);
	}

	if (!content) {
		return (
			<div className="space-y-2 text-center">
				<p className="text-sm text-muted-foreground">
					This form type is not yet available.
				</p>
			</div>
		);
	}

	return (
		<FormRenderer
			sections={content.sections}
			schema={content.schema}
			defaultValues={content.defaultValues}
			testData={content.testData}
			submitLabel={content.submitLabel}
			onSubmit={async values => {
				const response = await fetch("/api/forms/submit", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						token,
						formType,
						data: values,
					}),
				});

				if (!response.ok) {
					const payload = await response.json().catch(() => ({}));
					throw new Error(payload?.error || "Submission failed");
				}

				const payload = await response.json();
				setSubmitMessage(payload?.message || null);
				setSubmitted(true);
			}}
		/>
	);
}
