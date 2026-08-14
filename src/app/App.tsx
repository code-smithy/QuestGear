import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/app/AppLayout";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { BrowsePage } from "@/features/browse/BrowsePage";
import { HomePage } from "@/features/home/HomePage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { ItemDetailPage } from "@/features/items/ItemDetailPage";
import { ItemEditorPage } from "@/features/items/ItemEditorPage";
import { LoanDetailPage } from "@/features/loans/LoanDetailPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { OnboardingPage } from "@/features/profiles/OnboardingPage";
import { PlaceholderPage } from "@/features/shared/PlaceholderPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { PublicProfilePage } from "@/features/profiles/PublicProfilePage";
import { RequestsPage } from "@/features/loans/RequestsPage";
import { SettingsPage } from "@/features/profiles/SettingsPage";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1
    }
  }
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute requireProfile={false} />}>
                <Route element={<AppLayout />}>
                  <Route path="/onboarding" element={<OnboardingPage />} />
                </Route>
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/browse" element={<BrowsePage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/items/new" element={<ItemEditorPage />} />
                  <Route path="/items/:itemId" element={<ItemDetailPage />} />
                  <Route path="/items/:itemId/edit" element={<ItemEditorPage />} />
                  <Route path="/requests" element={<RequestsPage />} />
                  <Route path="/loans" element={<RequestsPage />} />
                  <Route path="/loans/:loanId" element={<LoanDetailPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/users/:userId" element={<PublicProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/help/reliability" element={<PlaceholderPage titleKey="routes.reliability" />} />
                  <Route path="*" element={<PlaceholderPage titleKey="routes.notFound" />} />
                </Route>
              </Route>
            </Routes>
          </HashRouter>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
