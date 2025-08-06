
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
};

const CURRENCIES: CurrencyOption[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
];

interface CurrencySelectorProps {
  onCurrencyChange?: (currency: string) => void;
  className?: string;
}

export function CurrencySelector({ onCurrencyChange, className }: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption>(CURRENCIES[0]);
  const { user } = useAuth();

  useEffect(() => {
    // Load user's preferred currency from profile
    const loadUserCurrency = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('preferred_currency')
        .eq('id', user.id)
        .single();

      if (data?.preferred_currency) {
        const currency = CURRENCIES.find(c => c.code === data.preferred_currency);
        if (currency) {
          setSelectedCurrency(currency);
          if (onCurrencyChange) {
            onCurrencyChange(currency.code);
          }
        }
      }
    };

    loadUserCurrency();
  }, [user, onCurrencyChange]);

  const handleCurrencySelect = async (currency: CurrencyOption) => {
    setSelectedCurrency(currency);
    
    if (onCurrencyChange) {
      onCurrencyChange(currency.code);
    }
    
    // Save user's currency preference
    if (user) {
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          preferred_currency: currency.code,
        });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {selectedCurrency.symbol} {selectedCurrency.code}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandEmpty>No currency found.</CommandEmpty>
          <CommandGroup>
            {CURRENCIES.map((currency) => (
              <CommandItem
                key={currency.code}
                value={currency.code}
                onSelect={() => {
                  handleCurrencySelect(currency);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedCurrency.code === currency.code
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                {currency.symbol} {currency.code} - {currency.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
