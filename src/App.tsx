import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import TrainingChatbot from "./pages/TrainingChatbot";
import PromptLibraryDetail from "./pages/PromptLibraryDetail";
import ConditionLibraryDetail from "./pages/ConditionLibraryDetail";
import ArticleStructureLibraryDetail from "./pages/ArticleStructureLibraryDetail";
import Staff from "./pages/Staff";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AppLayout } from "./components/AppLayout";
import { ApiSettingsProvider } from "@/contexts/ApiSettingsContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import ContentAi from "./pages/ContentAi";
import ProjectDetail from "./pages/ProjectDetail";
import CheckSeeding from "./pages/CheckSeeding";
import SeedingProjectDetail from "./pages/SeedingProjectDetail";
import Tools from "./pages/Tools";
import CheckKeywordComment from "@/pages/tools/check-keyword-comment";
import CheckKeywordCommentDetail from "@/pages/tools/CheckKeywordCommentDetail";
import CompletionNotification from "./pages/CompletionNotification";
import { NotificationProvider } from "./contexts/NotificationContext";
import CheckPostScan from "@/pages/tools/CheckPostScan";
import CheckPostScanDetail from "@/pages/tools/CheckPostScanDetail";
import { PermissionProvider } from "./contexts/PermissionContext";
import Reports from "./pages/Reports";
import AiPlan from "./pages/AiPlan";
import AiPlanDetail from "./pages/AiPlanDetail";

const queryClient = new QueryClient();

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <PermissionProvider>
        <ApiSettingsProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <NotificationProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/training-chatbot" element={<TrainingChatbot />} />
                      <Route path="/training-chatbot/prompts/:libraryId" element={<PromptLibraryDetail />} />
                      <Route path="/training-chatbot/conditions/:libraryId" element={<ConditionLibraryDetail />} />
                      <Route path="/training-chatbot/structures/:libraryId" element={<ArticleStructureLibraryDetail />} />
                      <Route path="/staff" element={<Staff />} />
                      <Route path="/content-ai" element={<ContentAi />} />
                      <Route path="/content-ai/:projectId" element={<ProjectDetail />} />
                      <Route path="/check-seeding" element={<CheckSeeding />} />
                      <Route path="/check-seeding/:projectId" element={<SeedingProjectDetail />} />
                      <Route path="/completion-notification" element={<CompletionNotification />} />
                      <Route path="/tools" element={<Tools />} />
                      <Route path="/tools/check-keyword-comment" element={<CheckKeywordComment />} />
                      <Route path="/tools/check-keyword-comment/:projectId" element={<CheckKeywordCommentDetail />} />
                      <Route path="/tools/check-post-scan" element={<CheckPostScan />} />
                      <Route path="/tools/check-post-scan/:projectId" element={<CheckPostScanDetail />} />
                      <Route path="/ai-plan" element={<AiPlan />} />
                      <Route path="/ai-plan/:planId" element={<AiPlanDetail />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </NotificationProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </ApiSettingsProvider>
      </PermissionProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;