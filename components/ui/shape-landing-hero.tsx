"use client";

import { motion } from "framer-motion";
import { Trophy, BarChart3, Star } from "lucide-react";
import Link from "next/link";

function FootballHero({
    badge = "The Beautiful Game",
    title1 = "Fantasy Premier League",
    title2 = "Summarizer",
    subtitle,
}: {
    badge?: string;
    title1?: string;
    title2?: string;
    subtitle?: string;
}) {
    const fadeUpVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.8,
                delay: 0.3 + i * 0.15,
                ease: [0.25, 0.4, 0.25, 1],
            },
        }),
    };

    return (
        <div className="relative w-full flex items-center justify-center overflow-hidden py-16 sm:py-20 md:py-24">
            {/* Subtle background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-gray-900 to-blue-900/20" />
            
            {/* Animated grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]">
                <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }} />
            </div>

            {/* Minimal floating orbs for depth */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                    }}
                    className="absolute top-20 left-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        x: [0, -80, 0],
                        y: [0, 60, 0],
                    }}
                    transition={{
                        duration: 18,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                    }}
                    className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"
                />
            </div>

            <div className="relative z-10 container mx-auto px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    {/* Badge */}
                    <motion.div
                        custom={0}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex justify-center mb-6 sm:mb-8"
                    >
                        <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 backdrop-blur-sm">
                            <Trophy className="h-4 w-4 text-yellow-400" />
                            <span className="text-xs sm:text-sm text-white/90 tracking-wide font-semibold">
                                {badge}
                            </span>
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        </div>
                    </motion.div>

                    {/* Title */}
                    <motion.div
                        custom={1}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="text-center mb-6 sm:mb-8"
                    >
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-3 sm:mb-4">
                            <span className="block text-white drop-shadow-2xl leading-tight">
                                {title1}
                            </span>
                            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 leading-tight">
                                {title2}
                            </span>
                        </h1>
                    </motion.div>

                    {/* Subtitle */}
                    {subtitle && (
                        <motion.div
                            custom={2}
                            variants={fadeUpVariants}
                            initial="hidden"
                            animate="visible"
                            className="text-center"
                        >
                            <p className="text-base sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
                                {subtitle}
                            </p>
                        </motion.div>
                    )}

                    {/* Quick Links */}
                    <motion.div
                        custom={3}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex items-center justify-center gap-4 sm:gap-6 mt-8 sm:mt-12"
                    >
                        <Link href="/stats" className="group">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-white/5 active:scale-95">
                                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white/40 group-hover:text-purple-400 transition-colors" />
                                <span className="text-xs sm:text-sm font-medium text-white/40 group-hover:text-white/80 transition-colors">Stats</span>
                            </div>
                        </Link>
                        
                        <div className="w-px h-4 bg-white/20" />
                        
                        <Link href="/" className="group">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-white/5 active:scale-95">
                                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-white/40 group-hover:text-yellow-400 transition-colors" />
                                <span className="text-xs sm:text-sm font-medium text-white/40 group-hover:text-white/80 transition-colors">Rankings</span>
                            </div>
                        </Link>
                        
                        <div className="w-px h-4 bg-white/20" />
                        
                        <Link href="/gameweek" className="group">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-white/5 active:scale-95">
                                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-white/40 group-hover:text-blue-400 transition-colors" />
                                <span className="text-xs sm:text-sm font-medium text-white/40 group-hover:text-white/80 transition-colors">Live</span>
                            </div>
                        </Link>
                    </motion.div>
                </div>
            </div>

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900 to-transparent"></div>
        </div>
    );
}

export { FootballHero }
