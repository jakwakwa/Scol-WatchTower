"use client";

import { PageMeta } from "./page-meta";
import { type WorkflowNotification } from "./notifications-panel";

interface DashboardLayoutProps {
	children: React.ReactNode;
	title?: string;
	description?: string;
	actions?: React.ReactNode;
	notifications?: WorkflowNotification[];
}

export function DashboardLayout({
	children,
	title,
	description,
	actions,
}: DashboardLayoutProps) {
	return (
		<>
			<PageMeta title={title} description={description} actions={actions} />
			{children}
		</>
	);
}

// Grid for dashboard cards
interface DashboardGridProps {
	children: React.ReactNode;
	columns?: 1 | 2 | 3 | 4;
	className?: string;
}

export function DashboardGrid({ children, columns = 4, className }: DashboardGridProps) {
	return (
		<div
			className={`grid gap-6 ${
				columns === 1
					? "grid-cols-1"
					: columns === 2
						? "grid-cols-1 md:grid-cols-2"
						: columns === 3
							? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
							: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
			} ${className || ""}`}>
			{children}
		</div>
	);
}

// Glassmorphism card wrapper
interface GlassCardProps {
	children: React.ReactNode;
	className?: string;
	hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
	return (
		<div
			className={`rounded-2xl border border-sidebar-border bg-card/90 backdrop-blur-sm p-6 shadow-xl shadow-black/5 ${
				hover
					? "transition-all duration-300 hover:bg-card/70 hover:border-secondary/10 hover:shadow-2xl hover:-translate-y-1"
					: ""
			} ${className || ""}`}>
			{children}
		</div>
	);
}

// Section with title
interface DashboardSectionProps {
	title: string;
	description?: string;
	children: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}

export function DashboardSection({
	title,
	description,
	children,
	action,
	className,
}: DashboardSectionProps) {
	return (
		<section className={`space-y-6 ${className || ""}`}>
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">{title}</h2>
					{description && <p className="text-sm text-muted-foreground">{description}</p>}
				</div>
				{action}
			</div>
			{children}
		</section>
	);
}
