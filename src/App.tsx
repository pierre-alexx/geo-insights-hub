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
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col bg-background">
                      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card/80 backdrop-blur-lg px-6 shadow-sm">
                        <SidebarTrigger className="rounded-lg" />
                        <div className="flex items-center gap-3">
                          <div className="h-px w-6 bg-border" />
                          <h2 className="text-sm font-medium text-muted-foreground">
                            BNP Paribas GEO Analytics
                          </h2>
                        </div>
                      </header>
                      <main className="flex-1 p-8 overflow-auto">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/run-test" element={<RunTest />} />
                          <Route path="/results" element={<Results />} />
                          <Route path="/page/:pageId" element={<PageDetail />} />
                          <Route path="/rewriter" element={<PageRewriter />} />
                          <Route path="/personas" element={<PersonaManagement />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
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
