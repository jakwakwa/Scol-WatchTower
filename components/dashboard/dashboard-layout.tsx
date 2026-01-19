"use client";

import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
	children: React.ReactNode;
	title?: string;
	description?: string;
	actions?: React.ReactNode;
}

export function DashboardLayout({
	children,
	title,
	description,
	actions,
}: DashboardLayoutProps) {
	return (
		<div className="min-h-screen bg-background">
			<Sidebar />

			{/* Main content */}
			<main className="pl-64 transition-all duration-300">
				{/* Header */}
				{(title || actions) && (
					<header className="sticky top-0 z-30 border-b border-sidebar-border bg-background/80 backdrop-blur-xl">
						<div className="flex h-20 items-center justify-between px-8">
							<div>
								{title && (
									<h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
										{title}
									</h1>
								)}
								{description && (
									<p className="text-sm text-muted-foreground mt-1">
										{description}
									</p>
								)}
							</div>
							{actions && (
								<div className="flex items-center gap-3">{actions}</div>
							)}
						</div>
					</header>
				)}

				{/* Page content */}
				<div className="p-8">{children}</div>
			</main>
		</div>
	);
}

// Grid for dashboard cards
interface DashboardGridProps {
	children: React.ReactNode;
	columns?: 1 | 2 | 3 | 4;
	className?: string;
}

export function DashboardGrid({
	children,
	columns = 4,
	className,
}: DashboardGridProps) {
	return (
		<div
			className={cn(
				"grid gap-6",
				columns === 1 && "grid-cols-1",
				columns === 2 && "grid-cols-1 md:grid-cols-2",
				columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
				columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
				className,
			)}
		>
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

export function GlassCard({
	children,
	className,
	hover = false,
}: GlassCardProps) {
	return (
		<div
			className={cn(
				"rounded-2xl border border-sidebar-border bg-card/50 backdrop-blur-sm p-6",
				"shadow-xl shadow-black/5",
				hover &&
					"transition-all duration-300 hover:bg-card/70 hover:border-white/10 hover:shadow-2xl hover:-translate-y-1",
				className,
			)}
		>
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
		<section className={cn("space-y-6", className)}>
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">{title}</h2>
					{description && (
						<p className="text-sm text-muted-foreground">{description}</p>
					)}
				</div>
				{action}
			</div>
			{children}
		</section>
	);
}
