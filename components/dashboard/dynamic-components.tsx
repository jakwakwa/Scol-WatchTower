"use client";

import dynamic from "next/dynamic";

export const DynamicWorkflowTable = dynamic(
    () => import("@/components/dashboard/workflow-table").then((mod) => mod.WorkflowTable),
    { ssr: false }
);

export const DynamicWebhookTester = dynamic(
    () => import("@/components/dashboard/webhook-tester").then((mod) => mod.WebhookTester),
    { ssr: false }
);
