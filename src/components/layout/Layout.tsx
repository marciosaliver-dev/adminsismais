import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
}

const COLLAPSED_KEY = "sidebar-collapsed";

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  // Listen for changes to collapsed state
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved !== null) {
        setIsCollapsed(JSON.parse(saved));
      }
    };

    // Check periodically for changes (since storage events don't fire in same tab)
    const interval = setInterval(handleStorageChange, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background w-full">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content area */}
      <div 
        className="min-h-screen flex flex-col transition-all duration-300"
        style={{ paddingLeft: `${isCollapsed ? 64 : 256}px` }}
      >
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
