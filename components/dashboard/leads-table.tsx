"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
	RiArrowDownSLine,
	RiArrowRightLine,
	RiArrowUpSLine,
	RiMoreLine,
} from "@remixicon/react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";

// --- Types ---

export interface LeadRow {
	id: number;
	companyName: string;
	contactName: string;
	email: string;
	status: string;
	industry: string;
	employeeCount: number;
	createdAt: Date;
}

// --- Configuration ---

const statusConfig: Record<string, { label: string; color: string }> = {
	new: { label: "New", color: "bg-blue-500/20 text-blue-400" },
	contacted: { label: "Contacted", color: "bg-purple-500/20 text-purple-400" },
	qualified: { label: "Qualified", color: "bg-stone-500/20 text-stone-400" },
	proposal: { label: "Proposal", color: "bg-stone-500/20 text-stone-400" },
	negotiation: { label: "Negotiation", color: "bg-pink-500/20 text-pink-400" },
	won: { label: "Won", color: "bg-emerald-500/20 text-teal-700" },
	lost: { label: "Lost", color: "bg-red-500/20 text-red-400" },
};

// --- Columns ---

export const columns: ColumnDef<LeadRow>[] = [
	{
		id: "select",
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && "indeterminate")
				}
				onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
				className="translate-y-0.5"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label="Select row"
				className="translate-y-0.5"
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: "companyName",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				className="-ml-4 hover:bg-transparent hover:text-foreground"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			>
				Company
				{column.getIsSorted() === "asc" ? (
					<RiArrowUpSLine className="ml-2 h-4 w-4" />
				) : column.getIsSorted() === "desc" ? (
					<RiArrowDownSLine className="ml-2 h-4 w-4" />
				) : (
					<RiArrowDownSLine className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100" />
				)}
			</Button>
		),
		cell: ({ row }) => (
			<div className="font-medium">{row.original.companyName}</div>
		),
	},
	{
		accessorKey: "contactName",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				className="-ml-4 hover:bg-transparent hover:text-foreground"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			>
				Contact
				{column.getIsSorted() === "asc" ? (
					<RiArrowUpSLine className="ml-2 h-4 w-4" />
				) : column.getIsSorted() === "desc" ? (
					<RiArrowDownSLine className="ml-2 h-4 w-4" />
				) : (
					<RiArrowDownSLine className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100" />
				)}
			</Button>
		),
		cell: ({ row }) => (
			<div>
				<div className="text-sm">{row.original.contactName}</div>
				<div className="text-xs text-muted-foreground">
					{row.original.email}
				</div>
			</div>
		),
	},
	{
		accessorKey: "industry",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				className="-ml-4 hover:bg-transparent hover:text-foreground"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			>
				Industry
				{column.getIsSorted() === "asc" ? (
					<RiArrowUpSLine className="ml-2 h-4 w-4" />
				) : column.getIsSorted() === "desc" ? (
					<RiArrowDownSLine className="ml-2 h-4 w-4" />
				) : (
					<RiArrowDownSLine className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100" />
				)}
			</Button>
		),
		cell: ({ row }) => (
			<div className="text-sm text-muted-foreground">
				{row.original.industry}
			</div>
		),
	},
	{
		accessorKey: "employeeCount",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				className="-ml-4 hover:bg-transparent hover:text-foreground"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			>
				Employees
				{column.getIsSorted() === "asc" ? (
					<RiArrowUpSLine className="ml-2 h-4 w-4" />
				) : column.getIsSorted() === "desc" ? (
					<RiArrowDownSLine className="ml-2 h-4 w-4" />
				) : (
					<RiArrowDownSLine className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100" />
				)}
			</Button>
		),
		cell: ({ row }) => (
			<div className="text-sm">
				{row.original.employeeCount?.toLocaleString() || "—"}
			</div>
		),
	},
	{
		accessorKey: "status",
		header: ({ column }) => (
			<Button
				variant="ghost"
				size="xs"
				className="-ml-4 hover:bg-transparent hover:text-foreground"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			>
				Status
				{column.getIsSorted() === "asc" ? (
					<RiArrowUpSLine className="ml-2 h-4 w-4" />
				) : column.getIsSorted() === "desc" ? (
					<RiArrowDownSLine className="ml-2 h-4 w-4" />
				) : (
					<RiArrowDownSLine className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100" />
				)}
			</Button>
		),
		cell: ({ row }) => {
			const config = statusConfig[row.original.status] || {
				label: row.original.status,
				color: "bg-secondary/10 text-muted-foreground",
			};
			return (
				<span
					className={cn(
						"inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
						config.color,
					)}
				>
					{config.label}
				</span>
			);
		},
	},
	{
		id: "actions",
		cell: ({ row }) => {
			return (
				<div className="flex items-center justify-end gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 hover:bg-secondary/10"
							>
								<RiMoreLine className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Actions</DropdownMenuLabel>
							<DropdownMenuItem>View Details</DropdownMenuItem>
							<DropdownMenuItem>Edit Lead</DropdownMenuItem>
							<DropdownMenuItem>Start Workflow</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem className="text-destructive focus:text-destructive">
								Delete Lead
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			);
		},
	},
];

// --- Main Component ---

interface LeadsTableProps {
	leads: LeadRow[];
}

export function LeadsTable({ leads }: LeadsTableProps) {
	return <DataTable columns={columns} data={leads} />;
}
