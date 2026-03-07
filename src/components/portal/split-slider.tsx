"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SplitSliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    showLabels?: boolean;
    className?: string;
    originalValue?: number;
}

export function SplitSlider({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 0.5,
    disabled = false,
    showLabels = true,
    className = "",
    originalValue,
}: SplitSliderProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        setDisplayValue(value);
    }, [value]);

    const calculateValue = useCallback(
        (clientX: number) => {
            const track = trackRef.current;
            if (!track) return value;

            const rect = track.getBoundingClientRect();
            const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const rawValue = min + percentage * (max - min);
            const steppedValue = Math.round(rawValue / step) * step;
            return Math.max(min, Math.min(max, steppedValue));
        },
        [min, max, step, value]
    );

    const handleStart = useCallback(
        (clientX: number) => {
            if (disabled) return;
            setIsDragging(true);
            const newValue = calculateValue(clientX);
            setDisplayValue(newValue);
            onChange(newValue);
        },
        [disabled, calculateValue, onChange]
    );

    const handleMove = useCallback(
        (clientX: number) => {
            if (!isDragging || disabled) return;
            const newValue = calculateValue(clientX);
            setDisplayValue(newValue);
            onChange(newValue);
        },
        [isDragging, disabled, calculateValue, onChange]
    );

    const handleEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Mouse events
    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            handleStart(e.clientX);
        },
        [handleStart]
    );

    // Touch events
    const handleTouchStart = useCallback(
        (e: React.TouchEvent) => {
            handleStart(e.touches[0].clientX);
        },
        [handleStart]
    );

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            handleMove(e.touches[0].clientX);
        },
        [handleMove]
    );

    // Global event listeners for dragging
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            handleMove(e.clientX);
        };

        const handleGlobalMouseUp = () => {
            handleEnd();
        };

        if (isDragging) {
            window.addEventListener("mousemove", handleGlobalMouseMove);
            window.addEventListener("mouseup", handleGlobalMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleGlobalMouseMove);
            window.removeEventListener("mouseup", handleGlobalMouseUp);
        };
    }, [isDragging, handleMove, handleEnd]);

    const percentage = ((displayValue - min) / (max - min)) * 100;
    const originalPercentage = originalValue !== undefined
        ? ((originalValue - min) / (max - min)) * 100
        : null;

    const valueChanged = originalValue !== undefined && Math.abs(displayValue - originalValue) > 0.01;

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Value display */}
            <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Split Percentage</span>
                <div className="flex items-center gap-2">
                    {originalValue !== undefined && valueChanged && (
                        <span className="text-sm text-slate-400 line-through">
                            {originalValue.toFixed(1)}%
                        </span>
                    )}
                    <span
                        className={`text-xl font-bold ${
                            valueChanged ? "text-indigo-600" : "text-slate-900"
                        }`}
                    >
                        {displayValue.toFixed(1)}%
                    </span>
                </div>
            </div>

            {/* Slider track */}
            <div
                ref={trackRef}
                className={`relative h-12 rounded-lg bg-slate-100 cursor-pointer select-none ${
                    disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleEnd}
            >
                {/* Original value marker */}
                {originalPercentage !== null && valueChanged && (
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-300 z-10"
                        style={{ left: `${originalPercentage}%` }}
                    >
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 whitespace-nowrap">
                            Original
                        </div>
                    </div>
                )}

                {/* Filled track */}
                <div
                    className={`absolute top-0 left-0 h-full rounded-l-lg transition-colors ${
                        isDragging ? "bg-indigo-500" : "bg-indigo-400"
                    }`}
                    style={{ width: `${percentage}%` }}
                />

                {/* Thumb */}
                <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg border-2 transition-all ${
                        isDragging
                            ? "border-indigo-600 scale-110 shadow-xl"
                            : "border-indigo-400"
                    } ${disabled ? "" : "active:scale-105"}`}
                    style={{ left: `${percentage}%` }}
                >
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1 h-4 bg-slate-300 rounded-full" />
                    </div>
                </div>

                {/* Touch target overlay (invisible, larger hit area for mobile) */}
                <div className="absolute inset-0 -inset-y-2" />
            </div>

            {/* Labels */}
            {showLabels && (
                <div className="flex justify-between text-xs text-slate-400">
                    <span>{min}%</span>
                    <span>{max}%</span>
                </div>
            )}

            {/* Quick select buttons */}
            <div className="flex gap-2 flex-wrap">
                {[25, 33.33, 50, 66.67, 75].map((preset) => (
                    <button
                        key={preset}
                        type="button"
                        onClick={() => !disabled && onChange(preset)}
                        disabled={disabled}
                        className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                            Math.abs(displayValue - preset) < 0.1
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        {preset === 33.33 ? "33⅓" : preset === 66.67 ? "66⅔" : preset}%
                    </button>
                ))}
            </div>
        </div>
    );
}
