import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Material } from '@domain/entities/material';
import { AuthProvider } from '@application/auth/auth-context';
import { I18nProvider } from '@application/i18n/i18n-context';
import { fetchMaterials } from '@infrastructure/api/material-api';
import { fetchProducts, type ProductItem } from '@infrastructure/api/product-api';
import { ProtectedRoute } from '@presentation/components/protected-route';
import { AdminLayout } from '@presentation/pages/admin-layout';
import { AdminMessagesPage } from '@presentation/pages/admin-messages-page';
import { AdminOrderCardsPage } from '@presentation/pages/admin-order-cards-page';
import { AdminOrdersPage } from '@presentation/pages/admin-orders-page';
import { AdminUsersPage } from '@presentation/pages/admin-users-page';
import { AuthCallbackPage } from '@presentation/pages/auth-callback-page';
import { CatalogPage } from '@presentation/pages/catalog-page';
import { ConfirmEmailPage } from '@presentation/pages/confirm-email-page';
import { DesignerPage } from '@presentation/pages/designer-page';
import { ForgotPasswordPage } from '@presentation/pages/forgot-password-page';
import { LandingPage } from '@presentation/pages/landing-page';
import { ResetPasswordPage } from '@presentation/pages/reset-password-page';
import { SignInPage } from '@presentation/pages/sign-in-page';
import { SignUpPage } from '@presentation/pages/sign-up-page';

export const App = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [loadedMaterials, loadedProducts] = await Promise.all([
          fetchMaterials(),
          fetchProducts()
        ]);
        setMaterials(loadedMaterials);
        setProducts(loadedProducts);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setMaterialsError(message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
        {isLoading ? (
          <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-200">
            Loading...
          </div>
        ) : materialsError ? (
          <div className="flex min-h-screen items-center justify-center bg-slate-900 text-red-300">
            Failed to load materials: {materialsError}
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<LandingPage materials={materials} />} />
            <Route path="/catalog" element={<CatalogPage materials={materials} products={products} />} />
            <Route path="/design" element={<DesignerPage materials={materials} />} />

            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/sign-up" element={<SignUpPage />} />
            <Route path="/confirm-email" element={<ConfirmEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="order-cards" element={<AdminOrderCardsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="messages" element={<AdminMessagesPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
};
