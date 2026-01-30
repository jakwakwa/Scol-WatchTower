"use client";

import { useMemo, useState } from "react";
import type { ZodTypeAny } from "zod";
import type { FieldValues, Resolver } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormField, RepeatableFieldGroup } from "./form-fields";
import type { FormSectionDefinition, FieldDefinition } from "./types";

interface FormRendererProps {
	sections: FormSectionDefinition[];
	schema: ZodTypeAny;
	defaultValues?: Record<string, unknown>;
	submitLabel?: string;
	onSubmit: (values: FieldValues) => Promise<void>;
	disabled?: boolean;
}

const isRepeatable = (
	field: FieldDefinition,
): field is Extract<FieldDefinition, { type: "repeatable" }> =>
	field.type === "repeatable";

export default function FormRenderer({
	sections,
	schema,
	defaultValues,
	submitLabel = "Submit",
	onSubmit,
	disabled,
}: FormRendererProps) {
	const [submitError, setSubmitError] = useState<string | null>(null);
	const form = useForm<FieldValues>({
		resolver: zodResolver(schema) as Resolver<FieldValues>,
		defaultValues,
	});

	const sectionLayouts = useMemo(
		() =>
			sections.map(section => ({
				...section,
				columns: section.columns ?? 2,
			})),
		[sections],
	);

	const handleSubmit = form.handleSubmit(async values => {
		setSubmitError(null);
		try {
			await onSubmit(values);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to submit form";
			setSubmitError(message);
		}
	});

	return (
		<FormProvider {...form}>
			<form onSubmit={handleSubmit} className="space-y-10">
				{sectionLayouts.map(section => (
					<section key={section.title} className="space-y-6">
						<div className="space-y-1">
							<h2 className="text-lg font-semibold text-foreground">
								{section.title}
							</h2>
							{section.description ? (
								<p className="text-sm text-muted-foreground">
									{section.description}
								</p>
							) : null}
						</div>
						<div
							className={`grid grid-cols-1 gap-6 ${
								section.columns === 2 ? "md:grid-cols-2" : ""
							}`}
						>
							{section.fields.map(field => {
								if (isRepeatable(field)) {
									return (
										<div key={field.name} className="md:col-span-2">
											<RepeatableFieldGroup field={field} />
										</div>
									);
								}

								return (
									<div
										key={field.name}
										className={field.colSpan === 2 ? "md:col-span-2" : ""}
									>
										<FormField field={field} />
									</div>
								);
							})}
						</div>
					</section>
				))}

				{submitError ? (
					<p className="text-sm text-destructive">{submitError}</p>
				) : null}

				<div className="flex items-center justify-end gap-3">
					<Button type="submit" disabled={disabled || form.formState.isSubmitting}>
						{form.formState.isSubmitting ? "Submitting..." : submitLabel}
					</Button>
				</div>
			</form>
		</FormProvider>
	);
}
