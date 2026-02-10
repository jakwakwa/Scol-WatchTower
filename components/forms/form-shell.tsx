import type React from "react";
import { Card } from "@/components/ui/card";

interface FormShellProps {
	title: string;
	description?: string;
	children: React.ReactNode;
}

const FormShell = ({ title, description, children }: FormShellProps) => {
	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 md:px-8">
			<header className="space-y-2">
				<h1 className="text-2xl font-semibold text-foreground md:text-3xl">{title}</h1>
				{description ? (
					<p className="text-sm text-muted-foreground md:text-base">{description}</p>
				) : null}
			</header>
			<Card className="p-6 shadow-sm md:p-8">{children}</Card>
		</div>
	);
};

export default FormShell;
