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
import PublicAiPlan from "./pages/PublicAiPlan";

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
                  <<dyad-problem-report summary="1 problems">
<problem file="src/App.tsx" line="17" column="37" code="2307">Cannot find module '@/contexts/ApiSettingsProvider' or its corresponding type declarations.</problem>
</dyad-problem-report><think>**Analyzing the TypeScript Error**

I'm currently focused on the TypeScript error flagged in `src/App.tsx`. The core issue appears to be a module resolution problem with `@/contexts/ApiSettingsProvider`. I'm scrutinizing the provided code snippet to pinpoint the likely cause of this import failure, considering potential path misconfigurations or missing declaration files.


**Rectifying the Import**

I've homed in on the incorrect import statement within `src/App.tsx`. The initial import path, pointing to `ApiSettingsProvider` from ` "@/contexts/ApiSettingsProvider"`, is flawed. My analysis reveals the correct path to the `ApiSettingsProvider` export is "@/contexts/ApiSettingsContext". I'm currently implementing the necessary correction to this import statement to resolve the TypeScript error and ensure proper module resolution.


**Correcting the Path**

I've identified the root cause of the TypeScript error. The original import statement in `src/App.tsx` incorrectly referenced `ApiSettingsProvider` from a nonexistent module. Analysis of the file structure revealed the correct module and export. I've updated the import to `from "@/contexts/ApiSettingsContext"` and am confident this resolves the module resolution issue and allows the application to build successfully.


**Updating the Import Path**

I'm now in the process of replacing the erroneous import statement in `src/App.tsx`. The current import path, which mistakenly points to a non-existent module, will be rectified. Analysis of the file structure indicates the correct path is `src/contexts/ApiSettingsContext.tsx`. I am now modifying the import statement to `from "@/contexts/ApiSettingsContext"` which will resolve the module resolution issue. This small change should fix the TypeScript error.


**Correcting the Module Import**

I've determined the correct import statement to resolve the TypeScript error. The incorrect module path ` "@/contexts/ApiSettingsProvider"` in `src/App.tsx` will be replaced. Analysis shows the correct path is ` "@/contexts/ApiSettingsContext"`. I'll update the import accordingly to ensure the application builds without the module resolution issue.


**Adjusting the Import**

I'm now in the process of rectifying the import statement in `src/App.tsx`. The initial import path appears incorrect, and my current analysis indicates the correct path to the `ApiSettingsProvider` export is `@/contexts/ApiSettingsContext`. I'm currently working to replace the incorrect import with the correct path to resolve the TypeScript error and ensure that module resolution functions correctly.


**Fixing the Module Path**

I've determined that the module resolution issue stems from an incorrect import path in `src/App.tsx`. The current import statement incorrectly references a non-existent module. My analysis of the file structure indicates the proper path is "@/contexts/ApiSettingsContext". I'm now implementing this correction to ensure the application builds successfully.


</think>Of course. I'll fix that import path for you. It looks like the file was just named slightly differently than what was in the import statement.

Here is the fix.

<dyad-write path="src/App.tsx" description="Fixing incorrect import path for ApiSettingsProvider.">
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
import PublicAiPlan from "./pages/PublicAiPlan";

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
                  <Route path="/public/ai-plan/:publicId" element={<PublicAiPlan />} />
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