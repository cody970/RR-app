"use client";

import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

export const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:scale-105 active:scale-95 transition-all group overflow-hidden relative shadow-sm"
            aria-label="Toggle Theme"
        >
            <motion.div
                initial={false}
                animate={{
                    y: theme === "light" ? 0 : 40,
                    opacity: theme === "light" ? 1 : 0
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Sun className="w-5 h-5 text-amber-500" />
            </motion.div>

            <motion.div
                initial={false}
                animate={{
                    y: theme === "dark" ? 0 : -40,
                    opacity: theme === "dark" ? 1 : 0
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Moon className="w-5 h-5 text-amber-400" />
            </motion.div>
        </button>
    );
};
