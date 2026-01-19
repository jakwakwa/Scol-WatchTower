"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RiLoader4Line } from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/dashboard";
import { cn } from "@/lib/utils";

interface LeadFormData {
	companyName: string;
	contactName: string;
	email: string;
	phone: string;
	industry: string;
	employeeCount: string;
	estimatedVolume: string;
	notes: string;
}

interface LeadFormProps {
	initialData?: Partial<LeadFormData>;
	onSubmit?: (data: LeadFormData) => Promise<void>;
	isEditing?: boolean;
}

export function LeadForm({
	initialData,
	onSubmit,
	isEditing = false,
}: LeadFormProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [errors, setErrors] = useState<
		Partial<Record<keyof LeadFormData, string>>
	>({});

	const [formData, setFormData] = useState<LeadFormData>({
		companyName: initialData?.companyName || "",
		contactName: initialData?.contactName || "",
		email: initialData?.email || "",
		phone: initialData?.phone || "",
		industry: initialData?.industry || "",
		employeeCount: initialData?.employeeCount || "",
		estimatedVolume: initialData?.estimatedVolume || "",
		notes: initialData?.notes || "",
	});

	const updateField = (field: keyof LeadFormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof LeadFormData, string>> = {};

		if (!formData.companyName.trim()) {
			newErrors.companyName = "Company name is required";
		}
		if (!formData.contactName.trim()) {
			newErrors.contactName = "Contact name is required";
		}
		if (!formData.email.trim()) {
			newErrors.email = "Email is required";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = "Invalid email address";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) return;

		setIsLoading(true);

		try {
			if (onSubmit) {
				await onSubmit(formData);
			} else {
				// Default behavior: POST to API
				const response = await fetch("/api/leads", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						...formData,
						employeeCount: formData.employeeCount
							? parseInt(formData.employeeCount, 10)
							: undefined,
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to create lead");
				}

				router.push("/dashboard/leads");
				router.refresh();
			}
		} catch (error) {
			console.error("Error saving lead:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			{/* Company Information */}
			<GlassCard>
				<h3 className="text-lg font-semibold mb-6">Company Information</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="space-y-2">
						<Label htmlFor="companyName">Company Name *</Label>
						<Input
							id="companyName"
							value={formData.companyName}
							onChange={(e) => updateField("companyName", e.target.value)}
							placeholder="Enter company name"
							className={cn(errors.companyName && "border-red-500")}
						/>
						{errors.companyName && (
							<p className="text-xs text-red-400">{errors.companyName}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="industry">Industry</Label>
						<Input
							id="industry"
							value={formData.industry}
							onChange={(e) => updateField("industry", e.target.value)}
							placeholder="e.g., Financial Services, Mining"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="employeeCount">Employee Count</Label>
						<Input
							id="employeeCount"
							type="number"
							value={formData.employeeCount}
							onChange={(e) => updateField("employeeCount", e.target.value)}
							placeholder="e.g., 250"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="estimatedVolume">Estimated Monthly Volume</Label>
						<Input
							id="estimatedVolume"
							value={formData.estimatedVolume}
							onChange={(e) => updateField("estimatedVolume", e.target.value)}
							placeholder="e.g., R500,000"
						/>
					</div>
				</div>
			</GlassCard>

			{/* Contact Information */}
			<GlassCard>
				<h3 className="text-lg font-semibold mb-6">Contact Information</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div className="space-y-2">
						<Label htmlFor="contactName">Contact Name *</Label>
						<Input
							id="contactName"
							value={formData.contactName}
							onChange={(e) => updateField("contactName", e.target.value)}
							placeholder="Enter contact name"
							className={cn(errors.contactName && "border-red-500")}
						/>
						{errors.contactName && (
							<p className="text-xs text-red-400">{errors.contactName}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="email">Email Address *</Label>
						<Input
							id="email"
							type="email"
							value={formData.email}
							onChange={(e) => updateField("email", e.target.value)}
							placeholder="contact@company.co.za"
							className={cn(errors.email && "border-red-500")}
						/>
						{errors.email && (
							<p className="text-xs text-red-400">{errors.email}</p>
						)}
					</div>

					<div className="space-y-2 md:col-span-2">
						<Label htmlFor="phone">Phone Number</Label>
						<Input
							id="phone"
							type="tel"
							value={formData.phone}
							onChange={(e) => updateField("phone", e.target.value)}
							placeholder="+27 XX XXX XXXX"
						/>
					</div>
				</div>
			</GlassCard>

			{/* Additional Notes */}
			<GlassCard>
				<h3 className="text-lg font-semibold mb-6">Additional Notes</h3>
				<div className="space-y-2">
					<Label htmlFor="notes">Notes</Label>
					<Textarea
						id="notes"
						value={formData.notes}
						onChange={(e) => updateField("notes", e.target.value)}
						placeholder="Add any relevant notes about this lead..."
						rows={4}
					/>
				</div>
			</GlassCard>

			{/* Actions */}
			<div className="flex items-center justify-end gap-4">
				<Button
					type="button"
					variant="ghost"
					onClick={() => router.back()}
					disabled={isLoading}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={isLoading}
					className="gap-2 bg-gradient-to-r from-stone-500 to-stone-500 hover:from-stone-600 hover:to-stone-600"
				>
					{isLoading && <RiLoader4Line className="h-4 w-4 animate-spin" />}
					{isEditing ? "Save Changes" : "Create Lead"}
				</Button>
			</div>
		</form>
	);
}
