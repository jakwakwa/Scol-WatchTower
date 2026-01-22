import {
	RiRobot2Line,
	RiCheckLine,
	RiLoader4Line,
	RiUserLine,
	RiAlertLine,
	RiTimeLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

interface Agent {
	id: string;
	agentId: string;
	name: string;
	taskType: string;
	status: "active" | "inactive" | "error";
	lastCallbackAt?: Date;
	callbackCount: number;
	errorCount: number;
}

const statusConfig = {
	active: {
		label: "Active",
		color: "text-teal-700",
		bgColor: "bg-teal-500/40",
		icon: RiCheckLine,
	},
	inactive: {
		label: "Idle",
		color: "text-muted-foreground",
		bgColor: "bg-white/5",
		icon: RiTimeLine,
	},
	error: {
		label: "Error",
		color: "text-red-400",
		bgColor: "bg-red-500/20",
		icon: RiAlertLine,
	},
};

interface AgentStatusCardProps {
	agent: Agent;
	onClick?: () => void;
}

export function AgentStatusCard({ agent, onClick }: AgentStatusCardProps) {
	const config = statusConfig[agent.status];
	const StatusIcon = config.icon;

	return (
		<div
			onClick={onClick}
			className={cn(
				"group relative overflow-hidden rounded-2xl border border-sidebar-border bg-card/50 backdrop-blur-sm p-6",
				"shadow-xl shadow-black/5",
				"transition-all duration-300",
				onClick &&
				"cursor-pointer hover:bg-card/70 hover:border-white/10 hover:shadow-2xl hover:-translate-y-1",
			)}
		>
			{/* Status indicator dot */}
			<div
				className={cn(
					"absolute top-4 right-4 h-2.5 w-2.5 rounded-full",
					agent.status === "active" && "bg-emerald-400 animate-pulse",
					agent.status === "inactive" && "bg-muted-foreground/50",
					agent.status === "error" && "bg-red-400 animate-pulse",
				)}
			/>

			{/* Header */}
			<div className="flex items-start gap-4">
				<div
					className={cn(
						"flex h-12 w-12 items-center justify-center rounded-xl",
						config.bgColor,
					)}
				>
					<RiRobot2Line className={cn("h-6 w-6", config.color)} />
				</div>
				<div className="flex-1 min-w-0">
					<h3 className="font-semibold truncate">{agent.name}</h3>
					<code className="text-xs text-muted-foreground">{agent.agentId}</code>
				</div>
			</div>

			{/* Task type badge */}
			<div className="mt-4">
				<span className="inline-flex items-center rounded-full bg-stone-500/10 px-2.5 py-1 text-xs font-medium text-stone-400">
					{formatTaskType(agent.taskType)}
				</span>
			</div>

			{/* Stats */}
			<div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
				<div>
					<p className="text-xs text-muted-foreground">Callbacks</p>
					<p className="text-lg font-bold">{agent.callbackCount}</p>
				</div>
				<div>
					<p className="text-xs text-muted-foreground">Errors</p>
					<p
						className={cn(
							"text-lg font-bold",
							agent.errorCount > 0 && "text-red-400",
						)}
					>
						{agent.errorCount}
					</p>
				</div>
			</div>

			{/* Last callback */}
			{agent.lastCallbackAt && (
				<div className="mt-4 text-xs text-muted-foreground">
					Last callback: {formatRelativeTime(agent.lastCallbackAt)}
				</div>
			)}
		</div>
	);
}

// Compact version for lists
interface AgentStatusRowProps {
	agent: Agent;
}

export function AgentStatusRow({ agent }: AgentStatusRowProps) {
	const config = statusConfig[agent.status];

	return (
		<div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
			<div
				className={cn(
					"h-2 w-2 rounded-full",
					agent.status === "active" && "bg-emerald-400",
					agent.status === "inactive" && "bg-muted-foreground/50",
					agent.status === "error" && "bg-red-400",
				)}
			/>
			<div className="flex-1 min-w-0">
				<p className="font-medium truncate">{agent.name}</p>
				<p className="text-xs text-muted-foreground">
					{formatTaskType(agent.taskType)}
				</p>
			</div>
			<span className={cn("text-xs font-medium", config.color)}>
				{config.label}
			</span>
		</div>
	);
}

// Helpers
function formatTaskType(type: string): string {
	return type
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function formatRelativeTime(date: Date): string {
	const now = new Date();
	const diff = now.getTime() - date.getTime();
	const minutes = Math.floor(diff / 60000);
	const hours = Math.floor(diff / 3600000);
	const days = Math.floor(diff / 86400000);

	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes}m ago`;
	if (hours < 24) return `${hours}h ago`;
	return `${days}d ago`;
}
