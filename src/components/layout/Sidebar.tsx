import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/hooks/use-sidebar";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  GraduationCap,
  Users,
  FolderKanban,
  BookOpen,
  ClipboardCheck,
  BrainCircuit,
  FolderClosed,
  BarChart4,
  Settings,
  LogOut,
  X,
  Menu,
  BookOpenCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useDeviceType } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NavItemProps = {
  icon: React.ElementType;
  label: string;
  href: string;
  isCollapsed: boolean;
  isActive?: boolean;
  children?: {
    icon?: React.ElementType;
    label: string;
    href: string;
  }[];
};

export function NavItem({
  icon: Icon,
  label,
  href,
  isCollapsed,
  isActive,
  children,
}: NavItemProps) {
  const [isOpen, setIsOpen] = useState(isActive);
  const hasChildren = children && children.length > 0;
  const location = useLocation();

  const isChildActive = (childHref: string) => {
    return location.pathname === childHref;
  };

  if (hasChildren) {
    return (
      <div className={cn("flex flex-col", !isCollapsed && "w-full")}>
        <Button
          variant="ghost"
          size={isCollapsed ? "icon" : "default"}
          className={cn(
            "justify-start gap-2 px-3 my-1",
            isOpen && "bg-muted",
            isCollapsed && "px-0"
          )}
          onClick={() => !isCollapsed && setIsOpen(!isOpen)}
        >
          <Icon className={cn("h-4 w-4", isOpen && "text-primary")} />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{label}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </>
          )}
        </Button>

        {!isCollapsed && isOpen && (
          <div className="ml-6 border-l pl-2 flex flex-col gap-1 my-1">
            {children.map((child, index) => {
              const ChildIcon = child.icon || Icon;
              const childActive = isChildActive(child.href);
              
              return (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "justify-start gap-2 my-0.5",
                    childActive && "bg-accent text-accent-foreground"
                  )}
                  asChild
                >
                  <Link to={child.href}>
                    {child.icon && <ChildIcon className="h-4 w-4" />}
                    <span className="flex-1 text-left text-sm">{child.label}</span>
                  </Link>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size={isCollapsed ? "icon" : "default"}
      className={cn(
        "justify-start gap-2 my-1",
        isActive && "bg-accent text-accent-foreground",
        isCollapsed && "px-0"
      )}
      asChild
    >
      <Link to={href}>
        <Icon className="h-4 w-4" />
        {!isCollapsed && <span className="flex-1 text-left">{label}</span>}
      </Link>
    </Button>
  );
}

// Mobile Sidebar Component
function MobileSidebar() {
  const { signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  const handleNavigation = () => {
    setOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col gap-1 overflow-y-auto p-3 h-full">
      <NavItem
        icon={LayoutDashboard}
        label="Dashboard"
        href="/dashboard"
        isCollapsed={false}
        isActive={isActive("/dashboard")}
      />

      <NavItem
        icon={GraduationCap}
        label="Academics"
        href="/academics"
        isCollapsed={false}
        isActive={isActive("/academics") || isActive("/students") || isActive("/classes") || isActive("/subjects")}
        children={[
          { label: "Students", href: "/students", icon: Users },
          { label: "Classes", href: "/classes", icon: FolderKanban },
          { label: "Subjects", href: "/subjects", icon: BookOpen },
        ]}
      />

      <NavItem
        icon={ClipboardCheck}
        label="Assessments"
        href="/assessments"
        isCollapsed={false}
        isActive={isActive("/assessments") || isActive("/tests") || isActive("/question-generation") || isActive("/auto-grade") || isActive("/analytics")}
        children={[
          { label: "Tests", href: "/tests" },
          { label: "Question Generation", href: "/question-generation" },
          { label: "Auto Grade", href: "/auto-grade", icon: BrainCircuit },
          { label: "Analytics", href: "/analytics", icon: BarChart4 },
        ]}
      />

      <NavItem
        icon={FolderClosed}
        label="Resources"
        href="/resources"
        isCollapsed={false}
        isActive={isActive("/resources")}
      />

      <div className="flex-1" />

      <NavItem
        icon={Settings}
        label="Settings"
        href="/settings"
        isCollapsed={false}
        isActive={isActive("/settings")}
      />

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
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden mr-2">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 pt-4 w-[280px]">
        <SheetHeader className="px-4 text-left border-b pb-2 mb-2">
          <SheetTitle>GradeLab Menu</SheetTitle>
        </SheetHeader>
        {sidebarContent}
      </SheetContent>
    </Sheet>
  );
}

export function Sidebar() {
  const { isOpen } = useSidebar();
  const location = useLocation();
  const { signOut } = useAuth();
  const { isMobile, isTablet } = useDeviceType();

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  // If on mobile or tablet, use mobile sidebar
  if (isMobile || isTablet) {
    return null; // The MobileSidebar is rendered in the Header component
  }

  const navItems: NavItemProps[] = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard",
      isCollapsed: false,
    },
    {
      icon: GraduationCap,
      label: "Classes",
      href: "/classes",
      isCollapsed: false,
    },
    {
      icon: Users,
      label: "Students",
      href: "/students",
      isCollapsed: false,
    },
    {
      icon: BookOpen,
      label: "Subjects",
      href: "/subjects",
      isCollapsed: false,
    },
    {
      icon: ClipboardCheck,
      label: "Tests",
      href: "/tests",
      isCollapsed: false,
    },
    {
      icon: BrainCircuit,
      label: "Auto Grade",
      href: "/auto-grade",
      isCollapsed: false,
    },
    {
      icon: FolderClosed,
      label: "Resources",
      href: "/resources",
      isCollapsed: false,
    },
    {
      icon: BookOpenCheck,
      label: "Google Classroom",
      href: "/google-classroom",
      isCollapsed: false,
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/settings",
      isCollapsed: false,
    },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-full flex-col border-r bg-sidebar transition-all duration-300 ease-in-out md:flex",
        isOpen ? "md:w-64" : "md:w-16"
      )}
    >
      <div className="flex flex-col gap-1 overflow-y-auto p-3 scrollbar-hide">
        {navItems.map((item, index) => (
          <NavItem
            key={index}
            icon={item.icon}
            label={item.label}
            href={item.href}
            isCollapsed={!isOpen}
            isActive={isActive(item.href)}
          />
        ))}

        <Button
          variant="ghost"
          size={!isOpen ? "icon" : "default"}
          className={cn(
            "justify-start gap-2 px-3 my-1 text-destructive hover:text-destructive hover:bg-destructive/10",
            !isOpen && "px-0"
          )}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {isOpen && <span className="flex-1 text-left">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}

// Export MobileSidebar to use in Header
export { MobileSidebar };
