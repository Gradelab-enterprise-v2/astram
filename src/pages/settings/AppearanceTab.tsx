
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun, Monitor } from "lucide-react";

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize the look and feel of the application.
        </p>
      </div>
      
      <div className="border rounded-lg p-4">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Theme Preferences</h4>
            <RadioGroup 
              defaultValue={theme} 
              onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem 
                  value="light" 
                  id="theme-light" 
                  className="peer sr-only" 
                />
                <Label 
                  htmlFor="theme-light" 
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Sun className="mb-3 h-6 w-6" />
                  Light
                </Label>
              </div>
              
              <div>
                <RadioGroupItem 
                  value="dark" 
                  id="theme-dark" 
                  className="peer sr-only" 
                />
                <Label 
                  htmlFor="theme-dark" 
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Moon className="mb-3 h-6 w-6" />
                  Dark
                </Label>
              </div>
              
              <div>
                <RadioGroupItem 
                  value="system" 
                  id="theme-system" 
                  className="peer sr-only" 
                />
                <Label 
                  htmlFor="theme-system" 
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Monitor className="mb-3 h-6 w-6" />
                  System
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
