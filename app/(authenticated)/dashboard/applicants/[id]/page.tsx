"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard";
import {
	RiBuildingLine,
	RiHashtag,
	RiMailLine,
	RiPhoneLine,
	RiShieldCheckLine,
	RiFileTextLine,
	RiUploadCloud2Line,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { GlassCard } from "@/components/dashboard";
import {
	StatusBadge,
	RiskBadge,
	StageBadge,
} from "@/components/ui/status-badge";
import { useParams } from "next/navigation";

interface ApplicantDetail {
	id: number;
	companyName: string;
	tradingName?: string | null;
	registrationNumber?: string | null;
	contactName: string;
	email: string;
	phone?: string | null;
	industry?: string | null;
	mandateType?: string | null;
	mandateVolume?: number | null;
	status: string;
	riskLevel?: string | null;
	itcScore?: number | null;
	accountExecutive?: string | null;
	createdAt?: string | number | Date | null;
}

interface ApplicantDocument {
	id: number;
	type: string;
	fileName?: string | null;
	status: string;
	uploadedAt?: string | number | Date | null;
}

interface ApplicantFormSubmission {
	id: number;
	formType: string;
	submittedAt?: string | number | Date | null;
	submittedBy?: string | null;
}

interface ApplicantFormInstance {
	id: number;
	formType: string;
	status: string;
	submittedAt?: string | number | Date | null;
}

const formatDate = (value?: string | number | Date | null) => {
	if (!value) return "-";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "-";
	return date.toLocaleDateString();
};

export default function ApplicantDetailPage() {
	const params = useParams();
	const id = params.id as string;
	const [applicant, setApplicant] = useState<ApplicantDetail | null>(null);
	const [documents, setDocuments] = useState<ApplicantDocument[]>([]);
	const [applicantSubmissions, setApplicantSubmissions] = useState<
		ApplicantFormSubmission[]
	>([]);
	const [applicantMagiclinkForms, setApplicantMagiclinkForms] = useState<
		ApplicantFormInstance[]
	>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		const fetchApplicant = async () => {
			try {
				const response = await fetch(`/api/applicants/${id}`);
				if (!response.ok) {
					throw new Error("Failed to fetch applicant");
				}
				const data = await response.json();
				if (!mounted) return;
				setApplicant(data.applicant);
				setDocuments(data.documents || []);
				setApplicantSubmissions(data.applicantSubmissions || []);
				setApplicantMagiclinkForms(data.applicantMagiclinkForms || []);
			} catch (err) {
				if (!mounted) return;
				setError(
					err instanceof Error ? err.message : "Failed to load applicant",
				);
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		fetchApplicant();
		return () => {
			mounted = false;
		};
	}, [id]);

	if (loading) {
		return (
			<DashboardLayout
				title="Loading..."
				description="Fetching applicant details"
			>
				<p className="text-sm text-muted-foreground">
					Loading applicant details...
				</p>
			</DashboardLayout>
		);
	}

	if (error || !applicant) {
		return (
			<DashboardLayout
				title="Applicant not found"
				description="Unable to load applicant"
			>
				<p className="text-sm text-destructive">
					{error || "Applicant not found"}
				</p>
			</DashboardLayout>
		);
	}

	const client = applicant;

	return (
		<DashboardLayout
			title={client.companyName}
			description={`Registration: ${client.registrationNumber || "N/A"}`}
			actions={
				<div className="flex gap-2">
					<Button variant="outline" size="sm">
						Edit Details
					</Button>
					<Button size="sm" className="bg-action hover:bg-action/85">
						Action Application
					</Button>
				</div>
			}
		>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Left Sidebar: Quick Stats & status */}
				<div className="space-y-6">
					<GlassCard className="space-y-6">
						<div>
							<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Current Stage
							</span>
							<div className="mt-2">
								<StageBadge stage={client.status} />
							</div>
						</div>

						<div>
							<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Risk Profile
							</span>
							<div className="mt-2 flex items-center gap-2">
								<RiskBadge level={client.riskLevel || "unknown"} />
								{client.itcScore !== null && client.itcScore !== undefined ? (
									<span
										className={`text-sm font-bold ${
											client.itcScore < 60
												? "text-destructive-foreground"
												: "text-emerald-500"
										}`}
									>
										ITC: {client.itcScore}
									</span>
								) : null}
							</div>
						</div>

						<Separator className="bg-border/50" />

						<div className="space-y-3">
							<div className="flex items-center gap-3 text-sm">
								<RiHashtag className="h-4 w-4 text-muted-foreground" />
								<span className="font-mono text-muted-foreground">
									{client.registrationNumber || "N/A"}
								</span>
							</div>
							<div className="flex items-center gap-3 text-sm">
								<RiBuildingLine className="h-4 w-4 text-muted-foreground" />
								<span>{client.industry || "Not specified"}</span>
							</div>
							<div className="flex items-center gap-3 text-sm">
								<RiShieldCheckLine className="h-4 w-4 text-muted-foreground" />
								<span className="capitalize">
									{client.mandateType
										? client.mandateType.replace("_", " ")
										: "Not set"}
								</span>
							</div>
						</div>
					</GlassCard>

					<GlassCard>
						<h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-muted-foreground">
							Primary Contact
						</h3>
						<div className="space-y-4">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold">
									{client.contactName.charAt(0)}
								</div>
								<div>
									<p className="font-semibold text-sm">{client.contactName}</p>
									<p className="text-xs text-muted-foreground">
										Main Signatory
									</p>
								</div>
							</div>
							<div className="space-y-2 text-sm">
								<div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
									<RiMailLine className="h-4 w-4" />
									{client.email}
								</div>
								<div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
									<RiPhoneLine className="h-4 w-4" />
									{client.phone || "Not provided"}
								</div>
							</div>
						</div>
					</GlassCard>
				</div>

				{/* Main Content Area */}
				<div className="lg:col-span-2">
					<Tabs defaultValue="overview" className="w-full">
						<TabsList className="mb-6 w-full justify-start border-b border-border/40 rounded-none bg-transparent h-auto p-0 gap-6">
							<TabsTrigger
								value="overview"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
							>
								Overview
							</TabsTrigger>
							<TabsTrigger
								value="documents"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
							>
								Documents & FICA
							</TabsTrigger>
							<TabsTrigger
								value="forms"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
							>
								Forms
							</TabsTrigger>
							<TabsTrigger
								value="risk"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
							>
								Risk Assessment
							</TabsTrigger>
							<TabsTrigger
								value="activity"
								className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
							>
								Activity Log
							</TabsTrigger>
						</TabsList>

						<TabsContent value="overview">
							<GlassCard className="mb-6">
								<h3 className="font-bold text-lg mb-4">Application Summary</h3>
								<p className="text-sm text-muted-foreground mb-6">
									Application initiated on{" "}
									<span className="font-medium text-foreground">
										{formatDate(client.createdAt)}
									</span>{" "}
									by{" "}
									<span className="font-medium text-foreground">
										{client.accountExecutive || "Unassigned"}
									</span>
									. Currently in{" "}
									<span className="font-medium text-foreground">
										{client.status}
									</span>{" "}
									stage awaiting next action.
								</p>
								<div className="grid grid-cols-2 gap-4">
									<div className="p-4 rounded-xl bg-action/10 border border-border/50">
										<p className="text-xs uppercase text-muted-foreground font-bold">
											Trading Name
										</p>
										<p className="font-medium mt-1">
											{client.tradingName || "Not provided"}
										</p>
									</div>
									<div className="p-4 rounded-xl bg-action/10 border border-border/50">
										<p className="text-xs uppercase text-muted-foreground font-bold">
											Estimated Vol
										</p>
										<p className="font-medium mt-1">
											R{" "}
											{client.mandateVolume
												? (client.mandateVolume / 100).toLocaleString()
												: "0"}
										</p>
									</div>
								</div>
							</GlassCard>
						</TabsContent>

						<TabsContent value="documents">
							<div className="space-y-4">
								<div className="flex justify-between items-center mb-4">
									<h3 className="font-bold text-lg">Required Documents</h3>
									<Button size="sm" variant="outline" className="gap-2">
										<RiUploadCloud2Line className="h-4 w-4" />
										Upload New
									</Button>
								</div>

								{documents.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										No documents uploaded yet.
									</p>
								) : (
									documents.map((doc) => (
										<div
											key={doc.id}
											className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-secondary/10 transition-colors"
										>
											<div className="flex items-center gap-4">
												<div className="h-10 w-10 rounded-lg flex items-center justify-center bg-secondary/40 text-secondary-foreground">
													<RiFileTextLine className="h-5 w-5" />
												</div>
												<div>
													<p className="font-medium text-sm">{doc.type}</p>
													<p className="text-xs text-muted-foreground">
														{doc.fileName || "No file uploaded"}
													</p>
												</div>
											</div>
											<div className="flex items-center gap-4">
												<span className="text-xs text-muted-foreground hidden sm:block">
													Uploaded {formatDate(doc.uploadedAt)}
												</span>
												<StatusBadge
													status={
														doc.status === "verified"
															? "success"
															: doc.status === "rejected"
																? "error"
																: "warning"
													}
												>
													{doc.status}
												</StatusBadge>
											</div>
										</div>
									))
								)}
							</div>
						</TabsContent>

						<TabsContent value="forms">
							<div className="space-y-4">
								<h3 className="font-bold text-lg">Form Submissions</h3>
								{applicantMagiclinkForms.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										No form links created yet.
									</p>
								) : (
									<div className="space-y-3">
										{applicantMagiclinkForms.map((instance) => {
											const submission = applicantSubmissions.find(
												(item) => item.formType === instance.formType,
											);
											return (
												<div
													key={instance.id}
													className="flex items-center justify-between rounded-xl border border-border/60 p-4"
												>
													<div>
														<p className="text-sm font-medium">
															{instance.formType.replace(/_/g, " ")}
														</p>
														<p className="text-xs text-muted-foreground">
															Status: {instance.status}
														</p>
													</div>
													<div className="text-right text-xs text-muted-foreground">
														{submission?.submittedBy
															? `Submitted by ${submission.submittedBy}`
															: "Not submitted"}
														<br />
														{formatDate(submission?.submittedAt)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</TabsContent>

						<TabsContent value="risk">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
								<GlassCard>
									<h4 className="text-sm font-bold uppercase text-muted-foreground mb-4">
										Financial Health
									</h4>
									<div className="space-y-4 text-sm text-muted-foreground">
										<p>
											AI analysis results will appear once documents are
											processed.
										</p>
									</div>
								</GlassCard>

								<GlassCard>
									<h4 className="text-sm font-bold uppercase text-muted-foreground mb-4">
										Identity Verification
									</h4>
									<div className="space-y-4">
										<div className="flex justify-between items-center">
											<span className="text-sm text-foreground">
												Account Holder Match
											</span>
											<StatusBadge status="warning">Pending</StatusBadge>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-sm text-foreground">
												Letterhead Verification
											</span>
											<StatusBadge status="warning">Pending</StatusBadge>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-sm text-foreground">
												CIPC Status
											</span>
											<StatusBadge status="warning">Pending</StatusBadge>
										</div>
									</div>
								</GlassCard>
							</div>

							<GlassCard className="border-l-4 border-l-blue-500">
								<h4 className="flex items-center gap-2 text-blue-500 font-bold mb-2">
									<RiShieldCheckLine className="h-5 w-5" />
									AI Risk Analysis
								</h4>
								<p className="text-sm leading-relaxed text-muted-foreground">
									Risk analysis will populate once AI verification completes.
								</p>
							</GlassCard>
						</TabsContent>

						<TabsContent value="activity">
							<div className="space-y-6 pl-2 border-l border-border/50 ml-2 py-2">
								{applicantSubmissions.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										No recent activity logged.
									</p>
								) : (
									applicantSubmissions.map((submission) => (
										<div key={submission.id} className="relative pl-6">
											<div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-border border-2 border-background"></div>
											<p className="text-sm font-medium">
												Form submitted: {submission.formType.replace(/_/g, " ")}
											</p>
											<p className="text-xs text-muted-foreground mb-1">
												{submission.submittedBy || "Client"} •{" "}
												{formatDate(submission.submittedAt)}
											</p>
										</div>
									))
								)}
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</DashboardLayout>
	);
}
