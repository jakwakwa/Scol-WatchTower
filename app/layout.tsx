import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
	title: "SCOL WatchTower -Onboarding Ai",
	description: "Database per user starter with Turso, Clerk, and SQLite",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider>
			<html lang="en" className={dmSans.variable} suppressHydrationWarning>
				<body className={`bg-rich-black overscroll-none ${inter.className}`} suppressHydrationWarning>
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
