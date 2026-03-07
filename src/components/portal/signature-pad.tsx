"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw } from "lucide-react";

interface SignaturePadProps {
    onSignatureChange: (signatureData: string | null) => void;
    width?: number;
    height?: number;
    className?: string;
    disabled?: boolean;
}

export function SignaturePad({
    onSignatureChange,
    width = 400,
    height = 200,
    className = "",
    disabled = false,
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set up canvas for high DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        // Style settings
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Fill with white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Draw signature line
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, height - 40);
        ctx.lineTo(width - 20, height - 40);
        ctx.stroke();

        // Add "Sign here" text
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px sans-serif";
        ctx.fillText("Sign above this line", 20, height - 20);

        // Reset stroke style for signature
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
    }, [width, height]);

    const getCoordinates = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
            const canvas = canvasRef.current;
            if (!canvas) return null;

            const rect = canvas.getBoundingClientRect();
            
            if ("touches" in e) {
                const touch = e.touches[0];
                return {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top,
                };
            } else {
                return {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                };
            }
        },
        []
    );

    const startDrawing = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
            if (disabled) return;
            
            e.preventDefault();
            const coords = getCoordinates(e);
            if (!coords) return;

            setIsDrawing(true);
            lastPointRef.current = coords;
        },
        [disabled, getCoordinates]
    );

    const draw = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
            if (!isDrawing || disabled) return;

            e.preventDefault();
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx || !lastPointRef.current) return;

            const coords = getCoordinates(e);
            if (!coords) return;

            ctx.beginPath();
            ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();

            lastPointRef.current = coords;
            setHasSignature(true);
        },
        [isDrawing, disabled, getCoordinates]
    );

    const stopDrawing = useCallback(() => {
        if (isDrawing && hasSignature) {
            // Export signature when drawing stops
            const canvas = canvasRef.current;
            if (canvas) {
                const signatureData = canvas.toDataURL("image/png");
                onSignatureChange(signatureData);
            }
        }
        setIsDrawing(false);
        lastPointRef.current = null;
    }, [isDrawing, hasSignature, onSignatureChange]);

    const clearSignature = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        // Clear and redraw
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Redraw signature line
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, height - 40);
        ctx.lineTo(width - 20, height - 40);
        ctx.stroke();

        // Redraw "Sign here" text
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px sans-serif";
        ctx.fillText("Sign above this line", 20, height - 20);

        // Reset stroke style
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;

        setHasSignature(false);
        onSignatureChange(null);
    }, [width, height, onSignatureChange]);

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="relative rounded-lg border-2 border-dashed border-slate-200 bg-white overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className={`touch-none ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-crosshair"}`}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ width, height }}
                />
                {!hasSignature && !disabled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-sm text-slate-400">Draw your signature here</p>
                    </div>
                )}
            </div>

            <div className="flex gap-2 justify-end">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                    disabled={disabled || !hasSignature}
                    className="text-slate-600"
                >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    Clear
                </Button>
            </div>

            {hasSignature && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded-md">
                    <Check className="w-4 h-4" />
                    Signature captured
                </div>
            )}
        </div>
    );
}

/**
 * Creates a SHA-256 hash of the signature data for verification
 */
export async function hashSignature(signatureData: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureData);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
