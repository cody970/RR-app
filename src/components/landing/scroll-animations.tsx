"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  type Variant,
} from "framer-motion";

/* ─────────────────────────────────────────────
 * FadeIn — fades + slides an element into view
 * when it enters the viewport.
 * ───────────────────────────────────────────── */
interface FadeInProps {
  children: ReactNode;
  className?: string;
  /** Direction the element slides from */
  direction?: "up" | "down" | "left" | "right" | "none";
  /** Pixels to translate from */
  distance?: number;
  /** Seconds before animation starts */
  delay?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Trigger once or every time */
  once?: boolean;
  /** IntersectionObserver `amount` threshold (0–1) */
  threshold?: number;
}

const directionOffset = (dir: FadeInProps["direction"], px: number) => {
  switch (dir) {
    case "up":
      return { y: px };
    case "down":
      return { y: -px };
    case "left":
      return { x: px };
    case "right":
      return { x: -px };
    default:
      return {};
  }
};

export function FadeIn({
  children,
  className,
  direction = "up",
  distance = 30,
  delay = 0,
  duration = 0.7,
  once = true,
  threshold = 0.15,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });

  const hidden: Variant = { opacity: 0, ...directionOffset(direction, distance) };
  const visible: Variant = { opacity: 1, x: 0, y: 0 };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={hidden}
      animate={isInView ? visible : hidden}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.4, 0.25, 1], // Apple-style ease
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
 * StaggerChildren — staggers child FadeIns
 * ───────────────────────────────────────────── */
interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Delay between each child (seconds) */
  stagger?: number;
  /** Base delay before first child */
  delay?: number;
  once?: boolean;
  threshold?: number;
}

export function StaggerChildren({
  children,
  className,
  stagger = 0.1,
  delay = 0,
  once = true,
  threshold = 0.1,
}: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Used inside StaggerChildren */
export function StaggerItem({
  children,
  className,
  direction = "up",
  distance = 30,
}: {
  children: ReactNode;
  className?: string;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, ...directionOffset(direction, distance) },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
 * ScaleIn — scales from smaller on scroll
 * ───────────────────────────────────────────── */
export function ScaleIn({
  children,
  className,
  delay = 0,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
 * ParallaxSection — slow parallax on scroll
 * ───────────────────────────────────────────── */
export function ParallaxSection({
  children,
  className,
  speed = 0.15,
}: {
  children: ReactNode;
  className?: string;
  /** 0 = no parallax, 0.5 = strong parallax */
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [`${speed * 100}px`, `-${speed * 100}px`]);

  return (
    <div ref={ref} className={className} style={{ overflow: "hidden" }}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
 * AnimatedCounter — counts up a number
 * when it enters the viewport.
 * ───────────────────────────────────────────── */
interface CounterProps {
  /** Target value to count to */
  value: number;
  /** Text before the number (e.g. "$") */
  prefix?: string;
  /** Text after the number (e.g. "M+", "%") */
  suffix?: string;
  /** Duration in seconds */
  duration?: number;
  className?: string;
  once?: boolean;
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 2,
  className,
  once = true,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once, amount: 0.5 });

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      >
        {isInView ? (
          <CountUp target={value} duration={duration} />
        ) : (
          "0"
        )}
      </motion.span>
      {suffix}
    </span>
  );
}

function CountUp({ target, duration }: { target: number; duration: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const hasDecimal = target % 1 !== 0;
  const decimalPlaces = hasDecimal ? (target.toString().split(".")[1]?.length ?? 1) : 0;

  useEffect(() => {
    let startTime: number | null = null;
    let rafId: number;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = (time - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;

      if (nodeRef.current) {
        nodeRef.current.textContent = hasDecimal
          ? current.toFixed(decimalPlaces)
          : Math.round(current).toLocaleString();
      }

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, hasDecimal, decimalPlaces]);

  return <span ref={nodeRef}>0</span>;
}

/* ─────────────────────────────────────────────
 * TextReveal — word-by-word text reveal
 * ───────────────────────────────────────────── */
export function TextReveal({
  text,
  className,
  once = true,
}: {
  text: string;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const isInView = useInView(ref, { once, amount: 0.3 });
  const words = text.split(" ");

  return (
    <motion.p
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.04 } },
      }}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block mr-[0.3em]"
          variants={{
            hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
            visible: {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] },
            },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.p>
  );
}

/* ─────────────────────────────────────────────
 * ScrollProgress — thin progress bar at top
 * showing page scroll progress
 * ───────────────────────────────────────────── */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] bg-green-500 z-[60] origin-left"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

/* ─────────────────────────────────────────────
 * BlurIn — blurs in from invisible
 * ───────────────────────────────────────────── */
export function BlurIn({
  children,
  className,
  delay = 0,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, filter: "blur(12px)" }}
      animate={
        isInView
          ? { opacity: 1, filter: "blur(0px)" }
          : { opacity: 0, filter: "blur(12px)" }
      }
      transition={{ duration: 0.8, delay, ease: [0.25, 0.4, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
