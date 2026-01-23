import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { TrustedBy } from "@/components/landing/trusted-by";

export default function Page() {
	return (
		<main className="min-h-screen bg-linear-to-br from-zinc-700 via-rich-black/20 to-black/90 overflow-x-hidden selection:bg-accent selection:text-accent-foreground">
			<Hero />
			<TrustedBy />
			<Features />
			<Footer />
		</main>
	);
}
