"use client";

import { useDashboardStore } from "@/lib/dashboard-store";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard";
import { PageMeta } from "@/components/dashboard/page-meta";
import {
    RiBuildingLine,
    RiHashtag,
    RiMailLine,
    RiPhoneLine,
    RiMapPinLine,
    RiShieldCheckLine,
    RiHistoryLine,
    RiFileTextLine,
    RiUploadCloud2Line,
    RiCheckDoubleLine,
    RiAlertLine
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { GlassCard } from "@/components/dashboard";
import { StatusBadge, RiskBadge, StageBadge } from "@/components/ui/status-badge";
import { useParams } from "next/navigation";

// Mock Data matching the User's Schema request
const CLIENT_DATA = {
    id: "1",
    companyName: "Durban Logistics Holdings",
    tradingName: "DLH Transport",
    registrationNumber: "2024/009012/07",
    contactName: "Sarah Jenkins",
    contactEmail: "sarah.j@dlh.co.za",
    contactPhone: "+27 82 555 0123",
    industry: "Logistics",
    mandateType: "debit_order",
    mandateVolume: 150000000, // R1.5m in cents
    status: "fica_review",
    riskLevel: "medium",
    itcScore: 65,
    accountExecutive: "Jacob Kotzee",
    createdAt: "2024-05-10T08:00:00Z",
};

const MOCK_DOCUMENTS = [
    { id: "1", type: "Company Registration (CIPC)", fileName: "cipc_cert.pdf", status: "verified", date: "2024-05-10" },
    { id: "2", type: "Director ID", fileName: "id_sarah.pdf", status: "verified", date: "2024-05-10" },
    { id: "3", type: "Bank Confirmation Letter", fileName: "bank_letter.pdf", status: "pending", date: "2024-05-11" },
    { id: "4", type: "Proof of Address", fileName: null, status: "missing", date: null },
];

const MOCK_RISK_ASSESSMENT = {
    overallRisk: "medium",
    cashFlowConsistency: "Stable",
    dishonouredPayments: 2,
    averageDailyBalance: 4500000, // R45k in cents
    accountMatch: "Verified",
    letterhead: "Verified",
    aiAnalysis: "The client shows stable turnover but has 2 recent dishonoured payments which requires explanation. Industry risk is moderate.",
    reviewedBy: null
};

export default function ClientDetailPage() {
    const params = useParams();
    const id = params.id as string;

    // In real app, fetch data based on ID
    const client = CLIENT_DATA;

    return (
        <DashboardLayout
            title={client.companyName}
            description={`Registration: ${client.registrationNumber}`}
            actions={
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">Edit Details</Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Action Application</Button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Sidebar: Quick Stats & status */}
                <div className="space-y-6">
                    <GlassCard className="space-y-6">
                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Stage</span>
                            <div className="mt-2">
                                <StageBadge stage={client.status} />
                            </div>
                        </div>

                        <div>
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Profile</span>
                            <div className="mt-2 flex items-center gap-2">
                                <RiskBadge level={client.riskLevel} />
                                <span className={`text-sm font-bold ${client.itcScore < 60 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    ITC: {client.itcScore}
                                </span>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <RiHashtag className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono text-muted-foreground">{client.registrationNumber}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <RiBuildingLine className="h-4 w-4 text-muted-foreground" />
                                <span>{client.industry}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <RiShieldCheckLine className="h-4 w-4 text-muted-foreground" />
                                <span className="capitalize">{client.mandateType.replace('_', ' ')}</span>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-muted-foreground">Primary Contact</h3>
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
                                <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                                    <RiMailLine className="h-4 w-4" />
                                    {client.contactEmail}
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                                    <RiPhoneLine className="h-4 w-4" />
                                    {client.contactPhone}
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
                                    Application initiated on <span className="font-medium text-foreground">10 May 2024</span> by <span className="font-medium text-foreground">{client.accountExecutive}</span>.
                                    Currently in <span className="font-medium text-foreground">FICA Review</span> stage awaiting final document verification.
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/50">
                                        <label className="text-xs uppercase text-muted-foreground font-bold">Trading Name</label>
                                        <p className="font-medium mt-1">{client.tradingName}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-secondary/20 border border-border/50">
                                        <label className="text-xs uppercase text-muted-foreground font-bold">Estimated Vol</label>
                                        <p className="font-medium mt-1">R {(client.mandateVolume / 100).toLocaleString()}</p>
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

                                {MOCK_DOCUMENTS.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-secondary/10 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${doc.status === 'verified' ? 'bg-emerald-500/10 text-emerald-500' :
                                                doc.status === 'missing' ? 'bg-rose-500/10 text-rose-500' :
                                                    'bg-amber-500/10 text-amber-500'
                                                }`}>
                                                <RiFileTextLine className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{doc.type}</p>
                                                <p className="text-xs text-muted-foreground">{doc.fileName || "No file uploaded"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {doc.date && <span className="text-xs text-muted-foreground hidden sm:block">Uploaded {doc.date}</span>}
                                            <StatusBadge status={
                                                doc.status === 'verified' ? 'success' :
                                                    doc.status === 'missing' ? 'error' : 'warning'
                                            }>
                                                {doc.status}
                                            </StatusBadge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="risk">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <GlassCard>
                                    <h4 className="text-sm font-bold uppercase text-muted-foreground mb-4">Financial Health</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-foreground">Cash Flow Consistency</span>
                                            <span className="text-sm font-bold text-emerald-500">{MOCK_RISK_ASSESSMENT.cashFlowConsistency}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-foreground">Dishonoured Payments</span>
                                            <span className="text-sm font-bold text-amber-500">{MOCK_RISK_ASSESSMENT.dishonouredPayments}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-foreground">Avg Daily Balance</span>
                                            <span className="text-sm font-mono">R {(MOCK_RISK_ASSESSMENT.averageDailyBalance / 100).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </GlassCard>

                                <GlassCard>
                                    <h4 className="text-sm font-bold uppercase text-muted-foreground mb-4">Identity Verification</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-foreground">Account Holder Match</span>
                                            <StatusBadge status="success" icon={<RiCheckDoubleLine className="h-3 w-3" />}>Verified</StatusBadge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-foreground">Letterhead Verification</span>
                                            <StatusBadge status="warning">Pending</StatusBadge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-foreground">CIPC Status</span>
                                            <StatusBadge status="success">Active</StatusBadge>
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
                                    {MOCK_RISK_ASSESSMENT.aiAnalysis}
                                </p>
                            </GlassCard>
                        </TabsContent>

                        <TabsContent value="activity">
                            <div className="space-y-6 pl-2 border-l border-border/50 ml-2 py-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="relative pl-6">
                                        <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-border border-2 border-background"></div>
                                        <p className="text-sm font-medium">Risk Assessment Updated</p>
                                        <p className="text-xs text-muted-foreground mb-1">by System AI • 2 hours ago</p>
                                        <p className="text-xs text-muted-foreground/70">
                                            Automated check detected new CIPC data.
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                    </Tabs>
                </div>
            </div>
        </DashboardLayout>
    );
}
