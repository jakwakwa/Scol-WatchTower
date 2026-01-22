"use client";

import * as React from "react";

import { Example, ExampleWrapper } from "@/components/example";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	RiAddLine,
	RiBluetoothLine,
	RiMore2Line,
	RiFileLine,
	RiFolderLine,
	RiFolderOpenLine,
	RiCodeLine,
	RiMoreLine,
	RiSearchLine,
	RiSaveLine,
	RiDownloadLine,
	RiEyeLine,
	RiLayoutLine,
	RiPaletteLine,
	RiSunLine,
	RiMoonLine,
	RiComputerLine,
	RiUserLine,
	RiBankCardLine,
	RiSettingsLine,
	RiKeyboardLine,
	RiTranslate,
	RiNotificationLine,
	RiMailLine,
	RiShieldLine,
	RiQuestionLine,
	RiFileTextLine,
	RiLogoutBoxLine,
} from "@remixicon/react";

export function ComponentExample() {
	return (
		<ExampleWrapper>
			<CardExample />
			<FormExample />
		</ExampleWrapper>
	);
}

function CardExample() {
	return (
		<Example title="Card" className="items-center justify-center">
			<Card className="relative w-full max-w-sm overflow-hidden pt-0">
				<div className="bg-primary absolute inset-0 z-30 aspect-video opacity-50 mix-blend-color" />
				{/* <img
					src=""
					alt=""
					title=""
					className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale"
				/> */}
				<CardHeader>
					<CardTitle>Onboarding Stratcol Ai + is coming soon!</CardTitle>
					<CardDescription>
						Switch to the improved way to explore onboard our clients,
						Onboarding will no longer be a pain in the ass with 16 steps to
						follow, the new number is 4
					</CardDescription>
				</CardHeader>
				<CardFooter>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button>
								<RiAddLine data-icon="inline-start" />
								Show Dialog
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent size="sm">
							<AlertDialogHeader>
								<AlertDialogMedia>
									<RiBluetoothLine />
								</AlertDialogMedia>
								<AlertDialogTitle>Allow accessory to connect?</AlertDialogTitle>
								<AlertDialogDescription>
									Do you want to allow us to phone you back??
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Don&apos;t allow</AlertDialogCancel>
								<AlertDialogAction>Allow</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
					<Badge variant="secondary" className="ml-auto">
						Warning
					</Badge>
				</CardFooter>
			</Card>
		</Example>
	);
}

const departments = ["Sales", "Risk", "AE", "Business", "Finance"] as const;

function FormExample() {
	const [notifications, setNotifications] = React.useState({
		email: true,
		sms: false,
		push: true,
	});
	const [theme, setTheme] = React.useState("light");

	return (
		<Example title="">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>User Waitlist</CardTitle>
					<CardDescription>Please fill in your details below</CardDescription>
					<CardAction></CardAction>
				</CardHeader>
				<CardContent>
					<form>
						<FieldGroup>
							<div className="grid grid-cols-2 gap-4">
								<Field>
									<FieldLabel htmlFor="small-form-name">Name</FieldLabel>
									<Input
										id="small-form-name"
										placeholder="Enter your name"
										required
									/>
								</Field>
								<Field>
									<FieldLabel htmlFor="small-form-role">Role</FieldLabel>
									<Select defaultValue="">
										<SelectTrigger id="small-form-role">
											<SelectValue placeholder="Select a role" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value="lead">Team Lead</SelectItem>
												<SelectItem value="admin">
													Onboarding Staff / Admin
												</SelectItem>
												<SelectItem value="risk">Risk Officer</SelectItem>
												<SelectItem value="finance">CFO</SelectItem>
												<SelectItem value="sales">Head of Marketing</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
							</div>
							<Field>
								<FieldLabel htmlFor="small-form-framework">
									Department
								</FieldLabel>
								<Combobox items={departments}>
									<ComboboxInput
										id="small-form-framework"
										placeholder="Select a framework"
										required
									/>
									<ComboboxContent>
										<ComboboxEmpty>No department found.</ComboboxEmpty>
										<ComboboxList>
											{(item, i) => (
												<ComboboxItem
													key={`item-${i + Math.random()}`}
													value={item}
												>
													{item}
												</ComboboxItem>
											)}
										</ComboboxList>
									</ComboboxContent>
								</Combobox>
							</Field>
							<Field>
								<FieldLabel htmlFor="small-form-comments">Comments</FieldLabel>
								<Textarea
									id="small-form-comments"
									placeholder="Add any additional comments"
								/>
							</Field>
							<Field orientation="horizontal">
								<Button type="submit">Submit</Button>
								<Button variant="outline" type="button">
									Cancel
								</Button>
							</Field>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>
		</Example>
	);
}

