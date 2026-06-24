import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { authStore } from "@/lib/auth";

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25 } },
};

export function AppLayout() {
  const location = useLocation();
  const token = authStore.getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 shrink-0">
            <SidebarTrigger className="mr-4" />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} {...pageTransition}>
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
