import Link from "next/link";
import { Github, Twitter } from "lucide-react";

export const Footer = () => {
	return (
		<footer className="bg-background py-12 border-t border-border/10">
			<div className="container px-4 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
				<div className="flex flex-col items-center md:items-start gap-2">
					<div className="text-xl font-black tracking-tighter text-white">SCOL</div>
					<p className="text-sm text-muted-foreground">
						© {new Date().getFullYear()} StratCol AI. All rights reserved.
					</p>
				</div>

				<div className="flex items-center gap-6 text-muted-foreground">
					<Link href="#" className="hover:text-primary transition-colors">
						Privacy
					</Link>
					<Link href="#" className="hover:text-primary transition-colors">
						Terms
					</Link>
					<Link href="#" className="hover:text-primary transition-colors">
						<Twitter size={20} />
					</Link>
					<Link href="#" className="hover:text-primary transition-colors">
						<Github size={20} />
					</Link>
				</div>
			</div>
		</footer>
	);
};
