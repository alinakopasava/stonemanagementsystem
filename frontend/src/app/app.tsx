import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Material } from '@domain/entities/material';
import { AuthProvider } from '@application/auth/auth-context';
import { I18nProvider, useTranslation } from '@application/i18n/i18n-context';
import { CurrencyProvider } from '@application/currency/currency-context';
import { fetchMaterials } from '@infrastructure/api/material-api';
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
import { InstallerCardsPage } from '@presentation/pages/installer-cards-page';
import { LandingPage } from '@presentation/pages/landing-page';
import { MyOrdersPage } from '@presentation/pages/my-orders-page';
import { ResetPasswordPage } from '@presentation/pages/reset-password-page';
import { SignInPage } from '@presentation/pages/sign-in-page';
import { SignUpPage } from '@presentation/pages/sign-up-page';

const AppBootScreen = ({
  isLoading,
  materialsError,
  onRetry
}: {
  isLoading: boolean;
  materialsError: string | null;
  onRetry: () => void;
}) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-canvas px-6">
        <p className="u-lapidary text-sm text-ink">Signature Stone</p>
        <div className="u-skeleton h-px w-40" />
        <p className="sr-only" role="status">
          {t('app.loading')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-canvas px-6">
      <p className="u-lapidary text-sm text-ink-3">Signature Stone</p>
      <p role="alert" className="max-w-prose text-center text-ink-2">
        {t('app.materialsError', { message: materialsError ?? t('admin.common.unknown') })}
      </p>
      <button type="button" onClick={onRetry} className="u-btn u-btn-primary">
        {t('app.retry')}
      </button>
    </div>
  );
};

export const App = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [loadGeneration, setLoadGeneration] = useState(0);

  const retryLoad = useCallback(() => {
    setIsLoading(true);
    setMaterialsError(null);
    setLoadGeneration((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const loadedMaterials = await fetchMaterials();
        if (cancelled) return;
        setMaterials(loadedMaterials);
        setMaterialsError(null);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Unknown error';
        setMaterialsError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [loadGeneration]);

  const storefrontBlocked = isLoading || Boolean(materialsError);

  return (
    <BrowserRouter>
      <I18nProvider>
        <CurrencyProvider>
          <AuthProvider>
            <Routes>
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/sign-up" element={<SignUpPage />} />
              <Route path="/confirm-email" element={<ConfirmEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              {/* Customers only: staff see the same orders through the panels
                  they work in, not through a personal order list. */}
              <Route
                path="/my-orders"
                element={
                  <ProtectedRoute allowedRoles={['klient']}>
                    <MyOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/installer"
                element={
                  <ProtectedRoute allowedRoles={['monter', 'admin']}>
                    <InstallerCardsPage />
                  </ProtectedRoute>
                }
              />
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

              {storefrontBlocked ? (
                <>
                  <Route
                    path="/"
                    element={
                      <AppBootScreen
                        isLoading={isLoading}
                        materialsError={materialsError}
                        onRetry={retryLoad}
                      />
                    }
                  />
                  <Route
                    path="/catalog"
                    element={
                      <AppBootScreen
                        isLoading={isLoading}
                        materialsError={materialsError}
                        onRetry={retryLoad}
                      />
                    }
                  />
                  <Route
                    path="/design"
                    element={
                      <AppBootScreen
                        isLoading={isLoading}
                        materialsError={materialsError}
                        onRetry={retryLoad}
                      />
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<LandingPage materials={materials} />} />
                  <Route path="/catalog" element={<CatalogPage materials={materials} />} />
                  <Route path="/design" element={<DesignerPage materials={materials} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </>
              )}
            </Routes>
          </AuthProvider>
        </CurrencyProvider>
      </I18nProvider>
    </BrowserRouter>
  );
};
