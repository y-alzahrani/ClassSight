import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function formatPercentage(value: number) {
  return `${Math.round(value)}%`
}

export function getAttentionLevel(score: number) {
  if (score >= 90) return { label: "Excellent", color: "green" }
  if (score >= 80) return { label: "Good", color: "blue" }
  if (score >= 70) return { label: "Fair", color: "yellow" }
  if (score >= 60) return { label: "Poor", color: "orange" }
  return { label: "Critical", color: "red" }
}

export function getOccupancyLevel(occupancy: number, capacity: number) {
  const percentage = (occupancy / capacity) * 100
  if (percentage >= 90) return { label: "Full", color: "red" }
  if (percentage >= 75) return { label: "High", color: "orange" }
  if (percentage >= 50) return { label: "Moderate", color: "yellow" }
  if (percentage >= 25) return { label: "Low", color: "green" }
  return { label: "Empty", color: "gray" }
}