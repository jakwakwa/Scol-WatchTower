"use client";

import { motion } from "framer-motion";
import { Bot, Database, Globe, Layers, Lock, Zap } from "lucide-react";

export const Features = () => {

    const features = [
        {
            icon: <Database className="w-6 h-6 text-primary" />,
            title: "Turso DB Integrated",
            description: "Built on LibSQL for edge-compatible, low-latency data access everywhere."
        },
        {
            icon: <Lock className="w-6 h-6 text-accent" />,
            title: "Secure Auth with Clerk",
            description: "Enterprise-grade authentication out of the box. Secure, fast, and reliable."
        },
        {
            icon: <Bot className="w-6 h-6 text-chart-1" />,
            title: "AI-Ready Schema",
            description: "Pre-configured database schema optimized for vector search and AI agents."
        },
        {
            icon: <Zap className="w-6 h-6 text-chart-2" />,
            title: "Instant API Webhooks",
            description: "Connected to external apps instantly with built-in webhook handlers."
        },
        {
            icon: <Globe className="w-6 h-6 text-chart-3" />,
            title: "Edge Deployed",
            description: "Global low latency using Vercel Edge functions and Turso replication."
        },
        {
            icon: <Layers className="w-6 h-6 text-chart-4" />,
            title: "Modern Stack",
            description: "Next.js 15, Tailwind 4, Drizzle, and more. A stack built for 2026."
        }
    ];

    return (
        <section className="py-24 bg-rich-black relative">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="text-3xl md:text-5xl font-bold mb-4 text-white"
                    >
                        Built for the <span className="text-accent">Future</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-muted-foreground text-lg max-w-2xl mx-auto"
                    >
                        Everything you need to build next-generation AI onboarding flows,
                        pre-configured and ready to ship.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="p-6 rounded-2xl bg-secondary/5 border border-secondary/10 hover:border-primary/50 transition-colors hover:bg-secondary/10"
                        >
                            <div className="w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center mb-4 border border-secondary/5">
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};
