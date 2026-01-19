"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	RiDashboardLine,
	RiUserAddLine,
	RiFlowChart,
	RiRobot2Line,
	RiSettings4Line,
	RiMenuFoldLine,
	RiMenuUnfoldLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

const navigation = [
	{ name: "Overview", href: "/dashboard", icon: RiDashboardLine },
	{ name: "Leads", href: "/dashboard/leads", icon: RiUserAddLine },
	{ name: "Workflows", href: "/dashboard/workflows", icon: RiFlowChart },
	{ name: "Agents", href: "/dashboard/agents", icon: RiRobot2Line },
	{ name: "Settings", href: "/dashboard/settings", icon: RiSettings4Line },
];

export function Sidebar() {
	const pathname = usePathname();
	const [isCollapsed, setIsCollapsed] = useState(false);

	return (
		<aside
			className={cn(
				"fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out",
				"bg-card/80 backdrop-blur-xl border-r border-white/5",
				isCollapsed ? "w-20" : "w-64",
			)}
		>
			{/* Header */}
			<div className="flex h-20 items-center justify-between px-6 border-b border-white/5">
				<div className={cn("flex items-center gap-3", isCollapsed && "hidden")}>
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							className="h-6 w-6 text-white"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
						</svg>
					</div>
					<span className="text-lg font-bold bg-gradient-to-r from-amber-200 to-orange-400 bg-clip-text text-transparent">
						Control Tower
					</span>
				</div>

				{/* Collapse button */}
				<button
					onClick={() => setIsCollapsed(!isCollapsed)}
					className={cn(
						"flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
						"hover:bg-white/5 text-muted-foreground hover:text-foreground",
						isCollapsed && "mx-auto",
					)}
					aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					{isCollapsed ? (
						<RiMenuUnfoldLine className="h-5 w-5" />
					) : (
						<RiMenuFoldLine className="h-5 w-5" />
					)}
				</button>
			</div>

			{/* Navigation */}
			<nav className="flex flex-col gap-1 p-4">
				{navigation.map((item) => {
					const isActive =
						pathname === item.href ||
						(item.href !== "/dashboard" && pathname.startsWith(item.href));

					return (
						<Link
							key={item.name}
							href={item.href}
							className={cn(
								"group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
								isActive
									? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-200"
									: "text-muted-foreground hover:bg-white/5 hover:text-foreground",
								isCollapsed && "justify-center px-0",
							)}
						>
							{/* Active indicator */}
							{isActive && (
								<div className="absolute left-0 h-8 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-500" />
							)}

							<item.icon
								className={cn(
									"h-5 w-5 shrink-0 transition-transform duration-200",
									isActive && "text-amber-400",
									!isActive && "group-hover:scale-110",
								)}
							/>

							{!isCollapsed && <span>{item.name}</span>}

							{/* Tooltip for collapsed state */}
							{isCollapsed && (
								<div className="absolute left-full ml-2 hidden rounded-md bg-popover px-2 py-1 text-xs shadow-lg group-hover:block">
									{item.name}
								</div>
							)}
						</Link>
					);
				})}
			</nav>

			{/* Bottom section */}
			<div className="absolute bottom-0 left-0 right-0 border-t border-white/5 p-4">
				<div
					className={cn(
						"flex items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-3",
						isCollapsed && "justify-center p-2",
					)}
				>
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
						<RiFlowChart className="h-4 w-4 text-amber-400" />
					</div>
					{!isCollapsed && (
						<div className="flex-1 min-w-0">
							<p className="text-xs font-medium text-amber-200">
								Active Workflows
							</p>
							<p className="text-lg font-bold text-foreground">12</p>
						</div>
					)}
				</div>
			</div>
		</aside>
	);
}
