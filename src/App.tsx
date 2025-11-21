import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import RunTest from "./pages/RunTest";
import Results from "./pages/Results";
import PageDetail from "./pages/PageDetail";
import PageRewriter from "./pages/PageRewriter";
import CreateGeoPage from "./pages/CreateGeoPage";
import PersonaManagement from "./pages/PersonaManagement";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full overflow-hidden">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col bg-background min-w-0">
                      <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-card/80 backdrop-blur-lg px-4 sm:px-6 shadow-sm shrink-0">
                        <SidebarTrigger className="rounded-lg shrink-0" />
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="h-px w-4 sm:w-6 bg-border shrink-0" />
                          <h2 className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                            BNP GEO
                          </h2>
                        </div>
                      </header>
                      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
                        <div className="max-w-7xl mx-auto w-full">
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/run-test" element={<RunTest />} />
                            <Route path="/results" element={<Results />} />
                            <Route path="/page/:pageId" element={<PageDetail />} />
                            <Route path="/rewriter" element={<PageRewriter />} />
                            <Route path="/create-page" element={<CreateGeoPage />} />
                            <Route path="/personas" element={<PersonaManagement />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </div>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
