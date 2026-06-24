import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { OnboardingRoute, ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute";
import { authStore } from "@/lib/auth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import LifeCapsule from "./pages/LifeCapsule";
import Journal from "./pages/Journal";
import VisionBoard from "./pages/VisionBoard";
import Goals from "./pages/Goals";
import Connections from "./pages/Connections";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import AIInsights from "./pages/AIInsights";


const queryClient = new QueryClient();





const AuthEventHandler = () => {
  const navigate = useNavigate();


  useEffect(() => {
    const onUnauthorized = () => {
      authStore.logout();
      navigate("/login", { replace: true });
    };

    window.addEventListener("lifeos:unauthorized", onUnauthorized);
    return () => window.removeEventListener("lifeos:unauthorized", onUnauthorized);
  }, [navigate]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthEventHandler />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
          <Route element={<OnboardingRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/life-capsule" element={<LifeCapsule />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/vision-board" element={<VisionBoard />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/connections" element={<Connections />} />
              <Route path="/ai-insights" element={<AIInsights />} />
              <Route path="/profile" element={<Profile />} />


            </Route>
          </Route>
          <Route path="/home" element={<Navigate to="/dashboard" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
