import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function calculateMonthComparison(current, previous) {
  if (previous === 0) {
    if (current === 0) return "0% vs mês anterior";
    return "↑ +100% vs mês anterior";
  }
  
  const percentage = ((current - previous) / previous) * 100;
  const formatted = Math.abs(percentage).toFixed(1);
  const arrow = percentage >= 0 ? "↑" : "↓";
  const sign = percentage >= 0 ? "+" : "-";
  
  return `${arrow} ${sign}${formatted}% vs mês anterior`;
}

export function calculatePeriodComparison(current, previous) {
  if (previous === 0) {
    return current > 0 ? "+100%" : "0%";
  }
  const diff = current - previous;
  const percentage = (diff / previous) * 100;
  const sign = percentage >= 0 ? "+" : "";
  // Return rounded integer percentage
  return `${sign}${percentage.toFixed(0)}%`;
}