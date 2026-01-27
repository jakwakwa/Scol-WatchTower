"use client";

import dynamic from "next/dynamic";

export const DynamicWorkflowTable = dynamic(
    () =>
        import("@/components/dashboard/workflow-table").then(
            (mod) => mod.WorkflowTable
        ),
    { ssr: false }
);
