"use client";

import {
	RiBuildingLine,
	RiCheckLine,
	RiDownloadLine,
	RiFileTextLine,
	RiHashtag,
	RiMailLine,
	RiMoneyDollarCircleLine,
	RiPhoneLine,
	RiShieldCheckLine,
	RiUploadCloud2Line,
} from "@remixicon/react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardLayout, GlassCard } from "@/components/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RiskBadge, StageBadge, StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
	storageUrl?: string | null;
}

interface ApplicantFormSubmission {
	id: number;
	formType: string;
	data?: string | null;
	submittedAt?: string | number | Date | null;
	submittedBy?: string | null;
}

interface ApplicantFormInstance {
	id: number;
	formType: string;
	status: string;
	submittedAt?: string | number | Date | null;
	token?: string | null;
}

interface RiskAssessment {
	id: number;
	overallRisk?: string | null;
	cashFlowConsistency?: string | null;
	dishonouredPayments?: number | null;
	averageDailyBalance?: number | null;
	accountMatchVerified?: string | null;
	letterheadVerified?: string | null;
	aiAnalysis?: string | null;
	reviewedBy?: string | null;
	reviewedAt?: string | number | Date | null;
	notes?: string | null;
}

interface Quote {
	id: number;
	amount: number;
	baseFeePercent: number;
	adjustedFeePercent?: number | null;
	details?: string | null;
	rationale?: string | null;
	status: string;
	generatedBy: string;
	createdAt?: string | number | Date | null;
}

interface Workflow {
	id: number;
	stage?: number | null;
	status?: string | null;
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
	const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
	const [quote, setQuote] = useState<Quote | null>(null);
	// Workflow data is fetched but currently used only for quote association
	const [_workflow, setWorkflow] = useState<Workflow | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [copiedFormId, setCopiedFormId] = useState<number | null>(null);
	const [expandedSubmission, setExpandedSubmission] = useState<number | null>(null);

	const handleCopyMagicLink = async (instance: ApplicantFormInstance) => {
		if (!instance.token) return;

		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL ||
			(typeof window !== "undefined" ? window.location.origin : "");
		const path =
			instance.formType === "DOCUMENT_UPLOADS"
				? `/uploads/${instance.token}`
				: `/forms/${instance.token}`;
		const url = `${baseUrl}${path}`;

		try {
			if (!navigator?.clipboard) {
				window.prompt("Copy magic link", url);
				return;
			}

			await navigator.clipboard.writeText(url);
			setCopiedFormId(instance.id);
			setTimeout(() => setCopiedFormId(null), 2000);
		} catch (copyError) {
			console.error("Failed to copy magic link:", copyError);
			window.prompt("Copy magic link", url);
		}
	};

	const handleDownloadDocument = (doc: ApplicantDocument) => {
		if (doc.storageUrl) {
			window.open(doc.storageUrl, "_blank");
		}
	};

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
				setRiskAssessment(data.riskAssessment || null);
				setQuote(data.quote || null);
				setWorkflow(data.workflow || null);
			} catch (err) {
				if (!mounted) return;
				setError(err instanceof Error ? err.message : "Failed to load applicant");
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
			<DashboardLayout title="Loading..." description="Fetching applicant details">
				<p className="text-sm text-muted-foreground">Loading applicant details...</p>
			</DashboardLayout>
		);
	}

	if (error || !applicant) {
		return (
			<DashboardLayout title="Applicant not found" description="Unable to load applicant">
				<p className="text-sm text-destructive">{error || "Applicant not found"}</p>
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
			}>
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
												: "text-emerald-900"
										}`}>
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
									{client.mandateType ? client.mandateType.replace("_", " ") : "Not set"}
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
									<p className="text-xs text-muted-foreground">Main Signatory</p>
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
						<TabsList className="mb-0 bg-black w-full justify-start border-b border-border/40 rounded-b-none rounded-t-3xl h-auto p-0 gap-2">
							<TabsTrigger
								value="overview"
								className="rounded-b-none border-b-2 border-transparent  px-4 py-3">
								Overview
							</TabsTrigger>
							<TabsTrigger
								value="documents"
								className="border-b-2 border-transparent  px-4 py-3">
								Documents & FICA
							</TabsTrigger>
							<TabsTrigger
								value="forms"
								className="border-b-2 border-transparent  px-4 py-3">
								Forms
							</TabsTrigger>
							<TabsTrigger
								value="risk"
								className="border-b-2 border-transparent  px-4 py-3">
								Risk Assessment
							</TabsTrigger>
							<TabsTrigger
								value="reviews"
								className="border-b-2 border-transparent  px-4 py-3">
								Reviews
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
									<span className="font-medium text-foreground">{client.status}</span>{" "}
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
									documents.map(doc => (
										<div
											key={doc.id}
											className="flex items-center justify-between p-4 rounded-xl border-2 border-b-white bg-card hover:bg-secondary/10 transition-colors">
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
													}>
													{doc.status}
												</StatusBadge>
												{doc.storageUrl && (
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
														onClick={() => handleDownloadDocument(doc)}
														title="Download document">
														<RiDownloadLine className="h-4 w-4" />
													</Button>
												)}
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
										{applicantMagiclinkForms.map(instance => {
											const submission = applicantSubmissions.find(
												item => item.formType === instance.formType
											);
											const isExpanded = expandedSubmission === submission?.id;
											let submissionData: Record<string, unknown> | null = null;
											if (submission?.data) {
												try {
													submissionData = JSON.parse(submission.data);
												} catch {
													submissionData = null;
												}
											}

											return (
												<div
													key={instance.id}
													className="rounded-xl border border-border/60 overflow-hidden">
													<div className="flex items-center justify-between p-4 bg-primary/10">
														<div>
															<p className="text-sm font-medium">
																{instance.formType.replace(/_/g, " ")}
															</p>
															<p className="text-xs text-muted-foreground">
																Status: {instance.status}
															</p>
															{instance.token ? (
																<Button
																	type="button"
																	variant="default"
																	size="xs"
																	className="mt-1 px-1"
																	onClick={() => handleCopyMagicLink(instance)}>
																	{copiedFormId === instance.id ? "Copied" : "Copy link"}
																</Button>
															) : (
																<p className="mt-1 text-xs text-muted-foreground">
																	Magic link unavailable
																</p>
															)}
														</div>
														<div className="flex items-center gap-3">
															<div className="text-right text-xs text-muted-foreground">
																{submission?.submittedBy
																	? `Submitted by ${submission.submittedBy}`
																	: "Not submitted"}
																<br />
																{formatDate(submission?.submittedAt)}
															</div>
															{submission?.data && (
																<Button
																	variant="secondary"
																	size="xs"
																	onClick={() =>
																		setExpandedSubmission(
																			isExpanded ? null : submission.id
																		)
																	}>
																	{isExpanded ? "Hide Data" : "View Data"}
																</Button>
															)}
														</div>
													</div>
													{isExpanded && submissionData && (
														<div className="border-t border-border/60 bg-secondary/5 p-4">
															<h5 className="text-xs font-bold uppercase text-muted-foreground mb-3">
																Submission Data
															</h5>
															<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
																{Object.entries(submissionData).map(([key, value]) => (
																	<div
																		key={key}
																		className="flex justify-between items-start p-2 rounded-lg bg-card border border-border/40">
																		<span className="text-xs text-muted-foreground capitalize">
																			{key.replace(/_/g, " ")}
																		</span>
																		<span className="text-xs font-medium text-foreground text-right max-w-[60%] wrap-break-word">
																			{typeof value === "object"
																				? JSON.stringify(value)
																				: String(value)}
																		</span>
																	</div>
																))}
															</div>
														</div>
													)}
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
									{riskAssessment ? (
										<div className="space-y-3">
											<div className="flex justify-between items-center">
												<span className="text-sm text-foreground">
													Cash Flow Consistency
												</span>
												<Badge
													variant="outline"
													className={
														riskAssessment.cashFlowConsistency === "consistent"
															? "text-emerald-500"
															: "text-amber-800"
													}>
													{riskAssessment.cashFlowConsistency || "Pending"}
												</Badge>
											</div>
											<div className="flex justify-between items-center">
												<span className="text-sm text-foreground">
													Dishonoured Payments
												</span>
												<span className="text-sm font-medium">
													{riskAssessment.dishonouredPayments ?? "-"}
												</span>
											</div>
											<div className="flex justify-between items-center">
												<span className="text-sm text-foreground">Avg Daily Balance</span>
												<span className="text-sm font-medium">
													{riskAssessment.averageDailyBalance
														? `R ${(riskAssessment.averageDailyBalance / 100).toLocaleString()}`
														: "-"}
												</span>
											</div>
										</div>
									) : (
										<p className="text-sm text-muted-foreground">
											AI analysis results will appear once documents are processed.
										</p>
									)}
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
											<StatusBadge
												status={
													riskAssessment?.accountMatchVerified === "yes"
														? "success"
														: riskAssessment?.accountMatchVerified === "no"
															? "error"
															: "warning"
												}>
												{riskAssessment?.accountMatchVerified || "Pending"}
											</StatusBadge>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-sm text-foreground">
												Letterhead Verification
											</span>
											<StatusBadge
												status={
													riskAssessment?.letterheadVerified === "yes"
														? "success"
														: riskAssessment?.letterheadVerified === "no"
															? "error"
															: "warning"
												}>
												{riskAssessment?.letterheadVerified || "Pending"}
											</StatusBadge>
										</div>
										<div className="flex justify-between items-center">
											<span className="text-sm text-foreground">Overall Risk Level</span>
											{riskAssessment?.overallRisk ? (
												<RiskBadge level={riskAssessment.overallRisk} />
											) : (
												<StatusBadge status="warning">Pending</StatusBadge>
											)}
										</div>
									</div>
								</GlassCard>
							</div>

							<GlassCard
								className={`border-l-4 ${
									riskAssessment?.overallRisk === "red"
										? "border-l-red-500"
										: riskAssessment?.overallRisk === "amber"
											? "border-l-amber-500"
											: riskAssessment?.overallRisk === "green"
												? "border-l-emerald-500"
												: "border-l-blue-500"
								}`}>
								<h4 className="flex items-center gap-2 text-blue-500 font-bold mb-2">
									<RiShieldCheckLine className="h-5 w-5" />
									AI Risk Analysis
								</h4>
								{riskAssessment?.aiAnalysis ? (
									<div className="text-sm leading-relaxed text-muted-foreground">
										{(() => {
											try {
												const analysis = JSON.parse(riskAssessment.aiAnalysis);
												return (
													<div className="space-y-2">
														{Object.entries(analysis).map(([key, value]) => (
															<p key={key}>
																<span className="font-medium capitalize">
																	{key.replace(/_/g, " ")}:
																</span>{" "}
																{String(value)}
															</p>
														))}
													</div>
												);
											} catch {
												return <p>{riskAssessment.aiAnalysis}</p>;
											}
										})()}
									</div>
								) : (
									<p className="text-sm leading-relaxed text-muted-foreground">
										Risk analysis will populate once AI verification completes.
									</p>
								)}
								{riskAssessment?.reviewedBy && (
									<p className="mt-4 text-xs text-muted-foreground">
										Reviewed by {riskAssessment.reviewedBy} on{" "}
										{formatDate(riskAssessment.reviewedAt)}
									</p>
								)}
							</GlassCard>
						</TabsContent>

						<TabsContent value="reviews">
							<div className="space-y-6">
								<h3 className="font-bold text-lg">Quote Review</h3>
								{quote ? (
									<GlassCard>
										<div className="flex items-start justify-between mb-6">
											<div className="flex items-center gap-3">
												<div className="h-12 w-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
													<RiMoneyDollarCircleLine className="h-6 w-6" />
												</div>
												<div>
													<h4 className="font-bold text-lg">
														R {(quote.amount / 100).toLocaleString()}
													</h4>
													<p className="text-xs text-muted-foreground">
														Generated by {quote.generatedBy}
													</p>
												</div>
											</div>
											<Badge
												variant="outline"
												className={
													quote.status === "approved"
														? "text-emerald-100 bg-emerald-600/80 border-emerald-500"
														: quote.status === "rejected"
															? "text-red-500 border-red-500"
															: quote.status === "pending_approval"
																? "text-amber-900 bg-amber-600/80 border-amber-500"
																: quote.status === "pending_signature"
																	? "text-blue-600 bg-blue-100 border-blue-500"
																	: "text-muted-foreground"
												}>
												{quote.status === "pending_signature" ? (
													<span className="flex items-center gap-1">
														Pending Signature
													</span>
												) : quote.status === "pending_approval" ? (
													<span className="flex items-center gap-1">
														Pending Approval
													</span>
												) : quote.status === "approved" ? (
													<span className="flex items-center gap-1">
														<RiCheckLine className="h-3 w-3" /> Approved
													</span>
												) : (
													quote.status
												)}
											</Badge>
										</div>

										<Separator className="mb-4" />

										<div className="grid grid-cols-2 gap-4 mb-6">
											<div className="p-3 rounded-lg bg-secondary/10 border border-border/40">
												<p className="text-xs text-muted-foreground mb-1">Base Fee</p>
												<p className="font-bold text-lg">
													{(quote.baseFeePercent / 100).toFixed(2)}%
												</p>
											</div>
											<div className="p-3 rounded-lg bg-secondary/10 border border-border/40">
												<p className="text-xs text-muted-foreground mb-1">Adjusted Fee</p>
												<p className="font-bold text-lg">
													{quote.adjustedFeePercent
														? `${(quote.adjustedFeePercent / 100).toFixed(2)}%`
														: "-"}
												</p>
											</div>
										</div>

										{quote.rationale && (
											<div className="mb-4">
												<h5 className="text-xs font-bold uppercase text-muted-foreground mb-2">
													Rationale
												</h5>
												<p className="text-sm text-muted-foreground">{quote.rationale}</p>
											</div>
										)}

										{quote.details && (
											<div>
												<h5 className="text-xs font-bold uppercase text-muted-foreground mb-2">
													Details
												</h5>
												<div className="text-sm text-muted-foreground">
													{(() => {
														try {
															const details = JSON.parse(quote.details);
															return (
																<div className="grid grid-cols-2 gap-2">
																	{Object.entries(details).map(([key, value]) => (
																		<div
																			key={key}
																			className="flex justify-between p-2 rounded bg-secondary/5 border border-border/30">
																			<span className="capitalize">
																				{key.replace(/_/g, " ")}
																			</span>
																			<span className="font-medium">{String(value)}</span>
																		</div>
																	))}
																</div>
															);
														} catch {
															return <p>{quote.details}</p>;
														}
													})()}
												</div>
											</div>
										)}

										<p className="mt-4 text-xs text-muted-foreground">
											Created on {formatDate(quote.createdAt)}
										</p>
									</GlassCard>
								) : (
									<GlassCard>
										<div className="flex flex-col items-center justify-center py-8 text-center">
											<RiMoneyDollarCircleLine className="h-12 w-12 text-muted-foreground/30 mb-4" />
											<p className="text-sm text-muted-foreground">
												No quote has been generated yet.
											</p>
											<p className="text-xs text-muted-foreground mt-1">
												A quote will be generated once the workflow reaches the
												appropriate stage.
											</p>
										</div>
									</GlassCard>
								)}
							</div>
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</DashboardLayout>
	);
}
