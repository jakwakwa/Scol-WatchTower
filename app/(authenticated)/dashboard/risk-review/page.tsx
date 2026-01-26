"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    RiskReviewQueue,
    RiskReviewDetail,
    type RiskReviewItem,
} from "@/components/dashboard/risk-review";
import {
    RiShieldCheckLine,
    RiRefreshLine,
    RiFilterLine,
    RiSearchLine,
} from "@remixicon/react";
import { toast } from "sonner";
import useSWR from "swr";

// ============================================
// Fetcher for SWR
// ============================================

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
};

// ============================================
// Page Component
// ============================================

export default function RiskReviewPage() {
    const router = useRouter();
    const [selectedItem, setSelectedItem] = React.useState<RiskReviewItem | null>(
        null
    );
    const [detailOpen, setDetailOpen] = React.useState(false);

    // Fetch pending reviews from API
    const { data, error, isLoading, mutate } = useSWR<{
        count: number;
        workflows: Array<{
            workflowId: number;
            leadId: number;
            stage: number;
            stageName: string;
            startedAt: string;
            currentAgent?: string;
        }>;
    }>("/api/risk-decision", fetcher, {
        refreshInterval: 30000, // Refresh every 30 seconds
    });

    // Transform API data to RiskReviewItem format
    // In production, you'd fetch more details from another endpoint
    const reviewItems: RiskReviewItem[] = React.useMemo(() => {
        if (!data?.workflows) return [];

        return data.workflows.map((w, idx) => ({
            id: w.workflowId,
            workflowId: w.workflowId,
            leadId: w.leadId,
            clientName: `Client ${w.leadId}`, // Would fetch from leads API
            companyName: `Company ${w.leadId} (Pty) Ltd`,
            stage: w.stage,
            stageName: w.stageName,
            createdAt: new Date(w.startedAt),
            // Mock AI analysis data - in production, fetch from workflow metadata
            aiTrustScore: 45 + Math.floor(Math.random() * 50),
            itcScore: 580 + Math.floor(Math.random() * 150),
            riskFlags:
                idx % 2 === 0
                    ? [
                        {
                            type: "BOUNCED_DEBIT",
                            severity: "HIGH" as const,
                            description: "Multiple bounced debit orders detected",
                        },
                    ]
                    : [],
            recommendation: idx % 2 === 0 ? "MANUAL_REVIEW" : "APPROVE",
            summary:
                "Financial analysis indicates generally healthy patterns with some areas requiring attention.",
            bankStatementVerified: true,
            accountantLetterVerified: idx % 2 === 0,
            nameMatchVerified: true,
        }));
    }, [data]);

    // Mock data for demo when API is empty
    const mockItems: RiskReviewItem[] = [
        {
            id: 1,
            workflowId: 101,
            leadId: 1,
            clientName: "Acme Industries",
            companyName: "Acme Industries (Pty) Ltd",
            stage: 3,
            stageName: "verification",
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            aiTrustScore: 72,
            itcScore: 685,
            riskFlags: [
                {
                    type: "CASH_INTENSIVE",
                    severity: "LOW",
                    description: "Higher than average cash transactions detected",
                },
            ],
            recommendation: "APPROVE_WITH_CONDITIONS",
            summary:
                "Bank statement shows generally healthy patterns. Minor observations include higher than average cash transactions (15% of total). ITC score is acceptable. Recommend approval with standard monitoring.",
            bankStatementVerified: true,
            accountantLetterVerified: true,
            nameMatchVerified: true,
        },
        {
            id: 2,
            workflowId: 102,
            leadId: 2,
            clientName: "TechStart Solutions",
            companyName: "TechStart Solutions (Pty) Ltd",
            stage: 3,
            stageName: "verification",
            createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
            aiTrustScore: 45,
            itcScore: 620,
            riskFlags: [
                {
                    type: "BOUNCED_DEBIT",
                    severity: "HIGH",
                    description: "3 dishonoured debit orders in the past 30 days",
                },
                {
                    type: "IRREGULAR_DEPOSITS",
                    severity: "MEDIUM",
                    description: "Large irregular deposits detected",
                },
            ],
            recommendation: "MANUAL_REVIEW",
            summary:
                "Bank statement shows concerning patterns including multiple dishonoured debits and irregular deposit patterns. ITC score is borderline. Manual review strongly recommended before approval.",
            bankStatementVerified: true,
            accountantLetterVerified: false,
            nameMatchVerified: true,
        },
        {
            id: 3,
            workflowId: 103,
            leadId: 3,
            clientName: "Global Trading Co",
            companyName: "Global Trading Company (Pty) Ltd",
            stage: 3,
            stageName: "verification",
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            aiTrustScore: 88,
            itcScore: 745,
            riskFlags: [],
            recommendation: "APPROVE",
            summary:
                "Excellent financial health indicators. No risk flags detected. ITC score is strong. All documents verified successfully. Suitable for fast-track approval.",
            bankStatementVerified: true,
            accountantLetterVerified: true,
            nameMatchVerified: true,
        },
    ];

    // Use mock data if no real data
    const displayItems = reviewItems.length > 0 ? reviewItems : mockItems;

    // Handle approve action
    const handleApprove = async (id: number, reason?: string) => {
        const item = displayItems.find((i) => i.id === id);
        if (!item) return;

        try {
            const response = await fetch("/api/risk-decision", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workflowId: item.workflowId,
                    leadId: item.leadId,
                    decision: {
                        outcome: "APPROVED",
                        reason: reason || "Approved by Risk Manager",
                    },
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to approve");
            }

            // Refresh the list
            mutate();
        } catch (error) {
            console.error("Approval error:", error);
            throw error;
        }
    };

    // Handle reject action
    const handleReject = async (id: number, reason: string) => {
        const item = displayItems.find((i) => i.id === id);
        if (!item) return;

        try {
            const response = await fetch("/api/risk-decision", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workflowId: item.workflowId,
                    leadId: item.leadId,
                    decision: {
                        outcome: "REJECTED",
                        reason,
                    },
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to reject");
            }

            // Refresh the list
            mutate();
        } catch (error) {
            console.error("Rejection error:", error);
            throw error;
        }
    };

    // Handle view details
    const handleViewDetails = (item: RiskReviewItem) => {
        setSelectedItem(item);
        setDetailOpen(true);
    };

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <RiShieldCheckLine className="h-6 w-6 text-primary" />
                        </div>
                        Risk Review Queue
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Review and approve pending client applications
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Badge
                        variant="secondary"
                        className="px-3 py-1.5 text-sm bg-amber-500/10 text-amber-400 border-amber-500/20"
                    >
                        {displayItems.length} Pending
                    </Badge>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => mutate()}
                        disabled={isLoading}
                    >
                        <RiRefreshLine
                            className={`h-4 w-4 mr-1.5 ${isLoading ? "animate-spin" : ""}`}
                        />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-card/30 border border-secondary/10 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Pending Review
                    </p>
                    <p className="text-2xl font-bold mt-1">{displayItems.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-card/30 border border-secondary/10 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        High Priority
                    </p>
                    <p className="text-2xl font-bold text-red-400 mt-1">
                        {displayItems.filter((i) => (i.aiTrustScore || 100) < 60).length}
                    </p>
                </div>
                <div className="p-4 rounded-xl bg-card/30 border border-secondary/10 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Approved Today
                    </p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">12</p>
                </div>
                <div className="p-4 rounded-xl bg-card/30 border border-secondary/10 backdrop-blur-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        Avg. Review Time
                    </p>
                    <p className="text-2xl font-bold mt-1">2.4h</p>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                    <p className="text-sm">
                        Failed to load pending reviews. Please try refreshing.
                    </p>
                </div>
            )}

            {/* Review Queue */}
            <RiskReviewQueue
                items={displayItems}
                isLoading={isLoading}
                onApprove={handleApprove}
                onReject={handleReject}
                onViewDetails={handleViewDetails}
                onRefresh={() => mutate()}
            />

            {/* Detail Sheet */}
            <RiskReviewDetail
                item={selectedItem}
                open={detailOpen}
                onOpenChange={setDetailOpen}
                onApprove={handleApprove}
                onReject={handleReject}
            />
        </div>
    );
}
