import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { NextResponse } from "next/server";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Standardized API error response helper.
 */
export function apiError(message: string, status: number = 400, details?: any) {
  return NextResponse.json({ error: message, details }, { status });
}

/**
 * High-precision currency formatting for financial data.
 */
export function formatCurrency(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
