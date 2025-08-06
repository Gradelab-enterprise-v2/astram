import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  GraduationCap,
  ClipboardCheck,
  FolderClosed,
  BarChart4,
  Settings,
  LogOut,
  ChevronDown,
  Users,
  BookOpen,
  FolderKanban,
  BrainCircuit,
  Menu
} from "lucide-react";
import { useDeviceType } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AstramLogo } from "@/components/ui/AstramLogo";
import { UserMenu } from "./UserMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { isMobile, isTablet } = useDeviceType();
  
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard
    },
    {
      name: "Academics",
      href: "/academics",
      icon: GraduationCap,
      dropdown: true,
      items: [
        { name: "Students", href: "/students", icon: Users },
        { name: "Classes", href: "/classes", icon: FolderKanban },
        { name: "Subjects", href: "/subjects", icon: BookOpen },
      ]
    },
    {
      name: "Assessments",
      href: "/assessments",
      icon: ClipboardCheck,
      dropdown: true,
      items: [
        { name: "Tests", href: "/tests", icon: ClipboardCheck },
        { name: "Question Generation", href: "/question-generation", icon: BrainCircuit },
        { name: "Auto Grade", href: "/auto-grade", icon: BrainCircuit },
      ]
    },
    {
      name: "Resources",
      href: "/resources",
      icon: FolderClosed
    },
  ];

  const MobileNav = () => (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 pt-4 w-[280px]">
        <SheetHeader className="px-4 text-left border-b pb-2 mb-2">
          <SheetTitle>GradeLab Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 overflow-y-auto p-3 h-full">
          {navigationItems.map((item) => (
            <div key={item.name} className="flex flex-col">
              <Button
                variant="ghost"
                className="justify-start gap-2 px-3 my-1"
                onClick={() => {
                  setOpen(false);
                  navigate(item.href);
                }}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.name}</span>
              </Button>
              
              {item.dropdown && item.items && (
                <div className="ml-6 border-l pl-2 flex flex-col gap-1 my-1">
                  {item.items.map((subItem) => {
                    const SubIcon = subItem.icon || item.icon;
                    return (
                      <Button
                        key={subItem.name}
                        variant="ghost"
                        size="sm"
                        className="justify-start gap-2 my-0.5"
                        onClick={() => {
                          setOpen(false);
                          navigate(subItem.href);
                        }}
                      >
                        {subItem.icon && <SubIcon className="h-4 w-4" />}
                        <span className="flex-1 text-left text-sm">{subItem.name}</span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          
          <div className="flex-1" />
          
          <Button
            variant="ghost"
            className="justify-start gap-2 px-3 my-1"
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
          >
            <Settings className="h-4 w-4" />
            <span className="flex-1 text-left">Settings</span>
          </Button>
          
          <Button
            variant="ghost"
            className="justify-start gap-2 px-3 my-1 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            <LogOut className="h-4 w-4" />
            <span className="flex-1 text-left">Logout</span>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  const NavDropdown = ({ item }: { item: any }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          {<item.icon className="h-4 w-4" />}
          {item.name}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-48 p-0">
        <div className="grid gap-0.5">
          {item.items?.map((subItem: any) => {
            const SubIcon = subItem.icon || item.icon;
            return (
              <Button
                key={subItem.name}
                variant="ghost"
                className="flex items-center justify-start w-full px-2 py-1.5 text-sm"
                onClick={() => navigate(subItem.href)}
              >
                {subItem.icon && <SubIcon className="mr-2 h-4 w-4" />}
                {subItem.name}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4">
        {(isMobile || isTablet) && <MobileNav />}
        
        <NavLink to="/dashboard" className="flex items-center gap-2 mr-4">
                      <AstramLogo size="md" />
        </NavLink>
        
        <nav className="hidden md:flex items-center space-x-2">
          {navigationItems.map((item) => 
            item.dropdown ? (
              <NavDropdown key={item.name} item={item} />
            ) : (
              <Button
                key={item.name}
                variant="ghost"
                className="flex items-center gap-2"
                onClick={() => navigate(item.href)}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Button>
            )
          )}
        </nav>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          {user && <UserMenu />}
        </div>
      </div>
    </header>
  );
}
