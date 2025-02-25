"use client";

import { motion } from "framer-motion";
import { Circle, Trophy, BarChart3, Flag, Shirt, Star } from "lucide-react";
import { cn } from "@/lib/utils";

function FootballShape({
    className,
    delay = 0,
    width = 400,
    height = 100,
    rotate = 0,
    gradient = "from-white/[0.08]",
    icon: Icon = Shirt,
    iconColor = "text-white/50",
    hideOnMobile = false,
}: {
    className?: string;
    delay?: number;
    width?: number;
    height?: number;
    rotate?: number;
    gradient?: string;
    icon?: React.ElementType;
    iconColor?: string;
    hideOnMobile?: boolean;
}) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: -150,
                rotate: rotate - 15,
            }}
            animate={{
                opacity: 1,
                y: 0,
                rotate: rotate,
            }}
            transition={{
                duration: 2.4,
                delay,
                ease: [0.23, 0.86, 0.39, 0.96],
                opacity: { duration: 1.2 },
            }}
            className={cn(
                "absolute",
                hideOnMobile && "hidden sm:block",
                className
            )}
        >
            <motion.div
                animate={{
                    y: [0, 15, 0],
                }}
                transition={{
                    duration: 12,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                }}
                style={{
                    width,
                    height,
                }}
                className="relative"
            >
                <div
                    className={cn(
                        "absolute inset-0 rounded-full",
                        "bg-gradient-to-r to-transparent",
                        gradient,
                        "backdrop-blur-[2px] border-2 border-white/[0.15]",
                        "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
                        "after:absolute after:inset-0 after:rounded-full",
                        "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]",
                        "flex items-center justify-center"
                    )}
                >
                    <Icon className={cn("h-12 w-12", iconColor)} />
                </div>
            </motion.div>
        </motion.div>
    );
}

function FootballHero({
    badge = "The Beautiful Game",
    title1 = "Fantasy Premier League",
    title2 = "Summarizer",
}: {
    badge?: string;
    title1?: string;
    title2?: string;
}) {
    const fadeUpVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                duration: 1,
                delay: 0.5 + i * 0.2,
                ease: [0.25, 0.4, 0.25, 1],
            },
        }),
    };

    return (
        <div className="relative w-full flex items-center justify-center overflow-hidden bg-[#051937] py-16 md:py-24 lg:py-32">
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/images/pitch-pattern.png')] bg-repeat"></div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-green-600/[0.08] via-transparent to-blue-600/[0.08] blur-3xl" />

            <div className="absolute inset-0 overflow-hidden">
                <FootballShape
                    delay={0.3}
                    width={200}
                    height={200}
                    rotate={12}
                    gradient="from-green-500/[0.15]"
                    icon={Trophy}
                    iconColor="text-yellow-500/90"
                    className="left-[-10%] md:left-[5%] top-[15%] md:top-[20%]"
                />

                <FootballShape
                    delay={0.5}
                    width={180}
                    height={180}
                    rotate={-15}
                    gradient="from-blue-500/[0.15]"
                    icon={BarChart3}
                    iconColor="text-blue-400/90"
                    className="right-[-10%] md:right-[10%] top-[70%] md:top-[65%]"
                />

                <FootballShape
                    delay={0.4}
                    width={160}
                    height={160}
                    rotate={-8}
                    gradient="from-yellow-500/[0.15]"
                    icon={Flag}
                    iconColor="text-yellow-400/90"
                    className="left-[-5%] md:left-[15%] bottom-[10%] md:bottom-[15%]"
                />

                <FootballShape
                    delay={0.6}
                    width={140}
                    height={140}
                    rotate={20}
                    gradient="from-red-500/[0.15]"
                    icon={Shirt}
                    iconColor="text-red-400/90"
                    className="right-[-5%] md:right-[5%] top-[10%] md:top-[25%]"
                    hideOnMobile={true}
                />

                <FootballShape
                    delay={0.7}
                    width={120}
                    height={120}
                    rotate={-25}
                    gradient="from-purple-500/[0.15]"
                    icon={Star}
                    iconColor="text-purple-400/90"
                    className="left-[30%] md:left-[25%] top-[5%] md:top-[10%]"
                    hideOnMobile={true}
                />
            </div>

            <div className="relative z-10 container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <motion.div
                        custom={0}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.1] border border-white/[0.15] mb-8 md:mb-12"
                    >
                        <Circle className="h-2 w-2 fill-green-500" />
                        <span className="text-sm text-white/80 tracking-wide font-medium">
                            {badge}
                        </span>
                    </motion.div>

                    <motion.div
                        custom={1}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="relative"
                    >
                        <div className="absolute inset-0 bg-black/20 blur-xl -m-4 rounded-3xl"></div>
                        <h1 className="relative text-4xl sm:text-6xl md:text-7xl font-bold mb-6 md:mb-8 tracking-tight">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/90 drop-shadow-sm">
                                {title1}
                            </span>
                            <br />
                            <span
                                className={cn(
                                    "bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-white to-blue-400 drop-shadow-sm"
                                )}
                            >
                                {title2}
                            </span>
                        </h1>
                    </motion.div>

                    <motion.div
                        custom={2}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-black/20 blur-lg -m-2 rounded-xl"></div>
                            <p className="relative text-base sm:text-lg md:text-xl text-white/80 mb-8 leading-relaxed font-light tracking-wide max-w-xl mx-auto px-4">
                                Your one-stop dashboard for Fantasy Premier League mini-league statistics, insights, and bragging rights.
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#131928] to-transparent"></div>
        </div>
    );
}

export { FootballHero }
