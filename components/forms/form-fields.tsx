"use client";

import { useMemo } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { FieldDefinition, FieldOption } from "./types";

const fieldWrapperClasses = "flex flex-col gap-2";

const getOptionLabel = (option: FieldOption) => option.label;

const getOptionValue = (option: FieldOption) => option.value;

function FieldError({ name }: { name: string }) {
	const {
		formState: { errors },
	} = useFormContext();

	const message = useMemo(() => {
		const parts = name.split(".");
		let current: unknown = errors;
		for (const part of parts) {
			if (!current || typeof current !== "object") return undefined;
			current = (current as Record<string, unknown>)[part];
		}
		const error = current as { message?: string } | undefined;
		return error?.message;
	}, [errors, name]);

	if (!message) {
		return null;
	}

	return <p className="text-xs text-destructive">{message}</p>;
}

function CheckboxGroup({
	name,
	options = [],
}: {
	name: string;
	options: FieldOption[];
}) {
	const { control } = useFormContext();

	return (
		<Controller
			control={control}
			name={name}
			render={({ field }) => {
				const value = Array.isArray(field.value) ? field.value : [];
				return (
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{options.map((option) => {
							const checked = value.includes(getOptionValue(option));
							const checkboxId = `${name}-${option.value}`;
							return (
								<div
									key={option.value}
									className="flex items-center gap-2 text-sm text-foreground"
								>
									<Checkbox
										id={checkboxId}
										checked={checked}
										onCheckedChange={(isChecked) => {
											const nextValue = isChecked
												? [...value, getOptionValue(option)]
												: value.filter(
														(item) => item !== getOptionValue(option),
													);
											field.onChange(nextValue);
										}}
										aria-label={getOptionLabel(option)}
									/>
									<span>{getOptionLabel(option)}</span>
								</div>
							);
						})}
					</div>
				);
			}}
		/>
	);
}

function SingleCheckbox({ name, label }: { name: string; label: string }) {
	const { control } = useFormContext();

	return (
		<Controller
			control={control}
			name={name}
			render={({ field }) => (
				<div className="flex items-center gap-2 text-sm text-foreground">
					<Checkbox
						id={name}
						checked={!!field.value}
						onCheckedChange={(checked) => field.onChange(!!checked)}
						aria-label={label}
					/>
					<span>{label}</span>
				</div>
			)}
		/>
	);
}

function SelectField({
	name,
	options = [],
	placeholder,
}: {
	name: string;
	options: FieldOption[];
	placeholder?: string;
}) {
	const { register } = useFormContext();

	return (
		<select
			{...register(name)}
			className="flex h-10 w-full rounded-md border border-input-border bg-background px-3 py-2 text-sm"
		>
			<option value="">{placeholder || "Select an option"}</option>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	);
}

export function FormField({
	field,
}: {
	field: Exclude<FieldDefinition, { type: "repeatable" }>;
}) {
	const { register } = useFormContext();

	if (field.type === "checkbox") {
		return (
			<div className={fieldWrapperClasses}>
				<SingleCheckbox name={field.name} label={field.label} />
				{field.description && (
					<p className="text-xs text-muted-foreground">{field.description}</p>
				)}
				<FieldError name={field.name} />
			</div>
		);
	}

	if (field.type === "checkbox-group") {
		return (
			<div className={fieldWrapperClasses}>
				<p className="text-sm font-medium text-foreground">
					{field.label}
					{field.required ? " *" : ""}
				</p>
				{field.description && (
					<p className="text-xs text-muted-foreground">{field.description}</p>
				)}
				<CheckboxGroup name={field.name} options={field.options || []} />
				<FieldError name={field.name} />
			</div>
		);
	}

	const inputClasses = cn(
		"border-input-border",
		field.type === "signature" && "font-medium",
	);

	return (
		<div className={fieldWrapperClasses}>
			<label
				className="text-sm font-medium text-foreground"
				htmlFor={field.name}
			>
				{field.label}
				{field.required ? " *" : ""}
			</label>
			{field.description && (
				<p className="text-xs text-muted-foreground">{field.description}</p>
			)}
			{field.type === "textarea" ? (
				<Textarea
					id={field.name}
					{...register(field.name)}
					placeholder={field.placeholder}
				/>
			) : field.type === "select" ? (
				<SelectField
					name={field.name}
					options={field.options || []}
					placeholder={field.placeholder}
				/>
			) : (
				<Input
					id={field.name}
					type={field.type === "signature" ? "text" : field.type}
					{...register(field.name)}
					placeholder={field.placeholder}
					className={inputClasses}
				/>
			)}
			<FieldError name={field.name} />
		</div>
	);
}

export function RepeatableFieldGroup({
	field,
}: {
	field: Extract<FieldDefinition, { type: "repeatable" }>;
}) {
	const { control } = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control,
		name: field.name,
	});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-foreground">{field.label}</p>
					{field.minItems ? (
						<p className="text-xs text-muted-foreground">
							Minimum {field.minItems}
						</p>
					) : null}
				</div>
				<button
					type="button"
					className="text-sm font-medium text-primary"
					onClick={() => append({})}
				>
					{field.addLabel || "Add another"}
				</button>
			</div>
			<div className="space-y-4">
				{fields.map((item, index) => (
					<div
						key={item.id}
						className="rounded-lg border border-border/60 p-4 space-y-4"
					>
						<div className="flex items-center justify-between">
							<p className="text-xs font-semibold uppercase text-muted-foreground">
								Entry {index + 1}
							</p>
							{fields.length > (field.minItems || 0) ? (
								<button
									type="button"
									className="text-xs font-medium text-destructive"
									onClick={() => remove(index)}
								>
									Remove
								</button>
							) : null}
						</div>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							{field.fields.map((subField) => (
								<FormField
									key={`${field.name}.${index}.${subField.name}`}
									field={{
										...subField,
										name: `${field.name}.${index}.${subField.name}`,
									}}
								/>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
