import { create } from 'zustand';
import type { ReactNode } from 'react';

interface DashboardState {
    title: string | null;
    description: string | null;
    actions: ReactNode | null;
    setMeta: (meta: { title?: string; description?: string; actions?: ReactNode }) => void;
}

export const useDashboardStore = create<DashboardState>(set => ({
    title: null,
    description: null,
    actions: null,
    setMeta: meta => set(state => ({ ...state, ...meta })),
}));
