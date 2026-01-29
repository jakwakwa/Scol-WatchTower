"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DocumentRequirement } from "@/config/document-requirements";

interface UploadViewProps {
	token: string;
	requirements: DocumentRequirement[];
}

type UploadStatus = "idle" | "uploading" | "uploaded" | "error";

export default function UploadView({ token, requirements }: UploadViewProps) {
	const [selectedFiles, setSelectedFiles] = useState<Record<string, File[]>>({});
	const [statuses, setStatuses] = useState<Record<string, UploadStatus>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const grouped = useMemo(() => {
		return requirements.reduce<Record<string, DocumentRequirement[]>>((acc, req) => {
			const key = req.category;
			const group = acc[key] ?? [];
			group.push(req);
			acc[key] = group;
			return acc;
		}, {});
	}, [requirements]);

	const handleFilesChange = (type: string, files: FileList | null) => {
		if (!files) return;
		setSelectedFiles(prev => ({
			...prev,
			[type]: Array.from(files),
		}));
	};

	const uploadDocuments = async (requirement: DocumentRequirement) => {
		const files = selectedFiles[requirement.type] || [];
		if (files.length === 0) {
			setErrors(prev => ({
				...prev,
				[requirement.type]: "Please select at least one file.",
			}));
			return;
		}

		setStatuses(prev => ({ ...prev, [requirement.type]: "uploading" }));
		setErrors(prev => ({ ...prev, [requirement.type]: "" }));

		const formData = new FormData();
		formData.append("token", token);
		formData.append("documentType", requirement.type);
		formData.append("category", requirement.category);
		files.forEach(file => formData.append("files", file));

		const response = await fetch("/api/documents/upload", {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			const payload = await response.json().catch(() => ({}));
			setStatuses(prev => ({ ...prev, [requirement.type]: "error" }));
			setErrors(prev => ({
				...prev,
				[requirement.type]: payload?.error || "Upload failed",
			}));
			return;
		}

		setStatuses(prev => ({ ...prev, [requirement.type]: "uploaded" }));
	};

	return (
		<div className="space-y-8">
			<p className="text-sm text-muted-foreground">
				Upload the supporting documents listed below. You can upload multiple
				files per requirement when needed.
			</p>

			{Object.entries(grouped).map(([category, items]) => (
				<section key={category} className="space-y-4">
					<h3 className="text-base font-semibold text-foreground">
						{category.replace(/_/g, " ")}
					</h3>
					<div className="space-y-4">
						{items.map(req => (
							<div
								key={req.type}
								className="rounded-lg border border-border/60 p-4 space-y-3"
							>
								<div className="flex items-start justify-between gap-4">
									<div>
										<p className="text-sm font-medium text-foreground">
											{req.label}
										</p>
										{req.description ? (
											<p className="text-xs text-muted-foreground">
												{req.description}
											</p>
										) : null}
										<p className="text-xs text-muted-foreground">
											{req.required ? "Required" : "Optional"}
										</p>
									</div>
									{statuses[req.type] === "uploaded" ? (
										<span className="text-xs font-medium text-emerald-500">
											Uploaded
										</span>
									) : null}
								</div>
								<div className="flex flex-col gap-3 md:flex-row md:items-center">
									<input
										type="file"
										multiple
										onChange={event => handleFilesChange(req.type, event.target.files)}
										className="text-sm"
									/>
									<Button
										type="button"
										variant="outline"
										disabled={statuses[req.type] === "uploading"}
										onClick={() => uploadDocuments(req)}
									>
										{statuses[req.type] === "uploading"
											? "Uploading..."
											: "Upload"}
									</Button>
								</div>
								{errors[req.type] ? (
									<p className="text-xs text-destructive">{errors[req.type]}</p>
								) : null}
							</div>
						))}
					</div>
				</section>
			))}
		</div>
	);
}
