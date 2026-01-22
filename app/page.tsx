import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Page() {
	return (
		<section>
			<div className="w-full flex justify-between items-center flex-col px-4 md:px-8 lg:px-16  lg:max-w-4xl  mx-auto">
				<div className="text-display text-5xl font-black text-center my-8">
					Welcome
				</div>
				<div className="flex w-full items-center justify-center my-8 gap-6 font-black bg-accent-foreground">
					<Link href="/sign-up">
						<Button size="lg" className="text-sm">sign up</Button>
					</Link>
					<Link href="/sign-in">
						<Button size="lg" className="text-sm">sign in</Button>
					</Link>
				</div>
			</div>
		</section>
	);
}
