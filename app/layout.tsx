import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' });

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
	title: "Turso Per User Starter",
	description: "Database per user starter with Turso, Clerk, and SQLite",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider>
			<html lang="en" className={dmSans.variable}>
				<body className={`bg-rich-black overscroll-none ${inter.className}`}>
					{children}
				</body>
			</html>
		</ClerkProvider>
	);
}
