"use client";

import { useState } from "react";
import FormRenderer from "@/components/forms/form-renderer";
import type { FormSectionDefinition } from "@/components/forms/types";
import type { FormType } from "@/lib/types";
import type { ZodTypeAny } from "zod";

interface FormViewProps {
	token: string;
	formType: Exclude<FormType, "DOCUMENT_UPLOADS">;
	sections: FormSectionDefinition[];
	schema: ZodTypeAny;
	defaultValues: Record<string, unknown>;
	submitLabel: string;
}

export default function FormView({
	token,
	formType,
	sections,
	schema,
	defaultValues,
	submitLabel,
}: FormViewProps) {
	const [submitted, setSubmitted] = useState(false);
	const [submitMessage, setSubmitMessage] = useState<string | null>(null);

	if (submitted) {
		return (
			<div className="space-y-4 text-center">
				<h2 className="text-xl font-semibold text-foreground">
					Submission received
				</h2>
				<p className="text-sm text-muted-foreground">
					Thank you. Your form has been submitted successfully.
				</p>
				{submitMessage ? (
					<p className="text-xs text-muted-foreground">{submitMessage}</p>
				) : null}
			</div>
		);
	}

	return (
		<FormRenderer
			sections={sections}
			schema={schema}
			defaultValues={defaultValues}
			submitLabel={submitLabel}
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
