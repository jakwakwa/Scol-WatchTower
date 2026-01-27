"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/lib/dashboard-store";

interface PageMetaProps {
    title?: string;
    description?: string;
    actions?: React.ReactNode;
}

export function PageMeta({ title, description, actions }: PageMetaProps) {
    const setMeta = useDashboardStore((state) => state.setMeta);

    useEffect(() => {
        setMeta({
            title: title || "",
            description: description || "",
            actions: actions || null
        });
        // Cleanup not strictly necessary if every page sets it, but good practice
        return () => setMeta({ title: "", description: "", actions: null });
    }, [title, description, actions, setMeta]);

    return null;
}
