import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/app/AppLayout";
import { BrowsePage } from "@/features/browse/BrowsePage";
import { HomePage } from "@/features/home/HomePage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { PlaceholderPage } from "@/features/shared/PlaceholderPage";
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
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/items/new" element={<PlaceholderPage titleKey="routes.newItem" />} />
              <Route path="/items/:itemId" element={<PlaceholderPage titleKey="routes.itemDetail" />} />
              <Route path="/items/:itemId/edit" element={<PlaceholderPage titleKey="routes.editItem" />} />
              <Route path="/onboarding" element={<PlaceholderPage titleKey="routes.onboarding" />} />
              <Route path="/requests" element={<PlaceholderPage titleKey="routes.requests" />} />
              <Route path="/loans" element={<PlaceholderPage titleKey="routes.loans" />} />
              <Route path="/loans/:loanId" element={<PlaceholderPage titleKey="routes.loanDetail" />} />
              <Route path="/notifications" element={<PlaceholderPage titleKey="routes.notifications" />} />
              <Route path="/users/:userId" element={<PlaceholderPage titleKey="routes.profile" />} />
              <Route path="/settings" element={<PlaceholderPage titleKey="routes.settings" />} />
              <Route path="/help/reliability" element={<PlaceholderPage titleKey="routes.reliability" />} />
              <Route path="*" element={<PlaceholderPage titleKey="routes.notFound" />} />
            </Route>
          </Routes>
        </HashRouter>
      </I18nProvider>
    </QueryClientProvider>
  );
}
