
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) {
    return 'N/A';
  }
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) {
    return 'N/A';
  }
  
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  // For some currencies like INR that might not be well-supported
  // in all browsers, fallback to manually formatting
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback formatting with common currency symbols
    const currencySymbols: Record<string, string> = {
      "USD": "$",
      "EUR": "€",
      "GBP": "£",
      "INR": "₹",
      "JPY": "¥",
      "CAD": "C$",
      "AUD": "A$",
      "SGD": "S$"
    };
    
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }
}
