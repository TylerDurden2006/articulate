import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Library,
  AlertTriangle,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Practice", path: "/practice", icon: BookOpen },
  { name: "5000 Words", path: "/library", icon: Library },
  { name: "Weak Words", path: "/weak-words", icon: AlertTriangle },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("dark");
    return stored ? stored === "true" : false;
  });

  useEffect(() => {
    localStorage.setItem("dark", String(dark));
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
      isActive
        ? "bg-accent text-accent-foreground font-semibold"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    );

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-md shrink-0">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        {sidebarOpen && (
          <span className="text-lg font-bold tracking-tight">Articulate</span>
        )}
      </div>
      <Separator />
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={linkClass}
            title={!sidebarOpen ? item.name : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>
      <Separator />
      <div className="p-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDark(!dark)}
          className="flex-1 justify-start gap-2"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {sidebarOpen && <span className="text-xs">{dark ? "Light" : "Dark"}</span>}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:flex"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      <aside
        className={cn(
          "hidden md:flex flex-col bg-card border-r border-border transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {sidebar}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              {sidebar}
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold">Articulate</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setDark(!dark)}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <Outlet />
        </div>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex justify-around items-end h-16 pb-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-end px-3 flex-1 h-full relative",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
              onClick={() => setMobileOpen(false)}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-md" />
                  )}
                  <item.icon className={cn("h-5 w-5 mb-1", isActive && "scale-110")} />
                  <span className="text-[10px] font-semibold tracking-wide">
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  );
}
