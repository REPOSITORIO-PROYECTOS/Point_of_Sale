import { useEffect, useState } from "react";
import { POS_PORTS } from "@/lib/pos-ports";

import { POSScreenEnhanced } from "./components/pos/POSScreenEnhanced";

import { ParcelsView } from "./components/parcels/ParcelsView";

import { ImportExportView } from "./components/inventory/ImportExportView";

import { AuditView } from "./components/audit/AuditView";

import { LoginView } from "./components/auth/LoginView";
import { SetupView } from "./components/auth/SetupView";

import { Header } from "./components/layout/Header";

import { AppVersionFooter } from "./components/layout/AppVersionFooter";
import { UpdateBanner } from "./components/layout/UpdateBanner";

import { LicenseRequiredView } from "./components/license/LicenseRequiredView";

import { SupportRecoveryDialog } from "./components/support/SupportRecoveryDialog";

import { Toaster } from "./components/ui/sonner";

import { ThemeProvider as NextThemeProvider } from "./components/theme-provider";

import { ThemeProvider } from "../lib/theme-context";

import { useAuth } from "../lib/auth-context";
import { AuthProvider } from "../lib/auth-provider";

import { useBusinessSettings } from "../lib/business-settings-context";
import { BusinessSettingsProvider } from "../lib/business-settings-provider";

import { LicenseExpiryBanner, LicenseGate } from "../lib/license-context";
import { AppUpdateProvider } from "../lib/app-update-provider";
import { ReceiptPreviewProvider } from "../lib/receipt-preview-provider";

import { HeldOrder } from "./components/pos/OrderQueuePanel";



function AppContent() {

  const { user, isLoading, needsSetup, apiUnavailable, canEditProducts, canViewAudit } = useAuth();

  const { settings: businessSettings } = useBusinessSettings();

  const [activeTab, setActiveTab] = useState("pos");

  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

  const [recoveryOpen, setRecoveryOpen] = useState(false);



  useEffect(() => {
    if (activeTab === "parcels" && !businessSettings.parcelsEnabled) {
      setActiveTab("pos");
    }
  }, [activeTab, businessSettings.parcelsEnabled]);



  return (

    <LicenseGate>

      {({ license, isLoading: licenseLoading, refresh }) => {

        if (licenseLoading || isLoading) {

          return (

            <div className="size-full flex items-center justify-center bg-background text-muted-foreground">

              Cargando sesión...

            </div>

          );

        }

        if (apiUnavailable) {
          return (
            <div className="size-full flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
              <h1 className="text-xl font-semibold text-foreground">API no disponible</h1>
              <p className="max-w-md text-muted-foreground">
                No se pudo conectar con el backend en{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm">127.0.0.1:{POS_PORTS.api}</code>.
                Ejecutá <code className="rounded bg-muted px-1.5 py-0.5 text-sm">npm run dev:api</code> o{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm">npm run dev:stack</code> desde la raíz del
                proyecto.
              </p>
              <button
                type="button"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </button>
            </div>
          );
        }

        if (license && !license.allowed) {

          return (

            <LicenseRequiredView

              message={license.message}

              machineId={license.machineId}

              onActivated={() => void refresh()}

            />

          );

        }



        if (!user) {
          if (needsSetup) {
            return <SetupView />;
          }

          return <LoginView />;
        }



        return (

          <div className="size-full flex flex-col bg-background">

            {license && <LicenseExpiryBanner license={license} />}

            <UpdateBanner />

            <Header activeTab={activeTab} onTabChange={setActiveTab} />



            <div className="flex-1 overflow-hidden">

              {activeTab === "pos" && (

                <POSScreenEnhanced

                  heldOrders={heldOrders}

                  onHeldOrdersChange={setHeldOrders}

                />

              )}

              {activeTab === "parcels" &&
                user.role === "admin" &&
                businessSettings.parcelsEnabled && <ParcelsView />}

              {activeTab === "inventory" && canEditProducts && <ImportExportView />}

              {activeTab === "audit" && canViewAudit && <AuditView />}

            </div>



            <AppVersionFooter
              onOpenRecovery={() => setRecoveryOpen(true)}
              clientNumberMasked={license?.clientNumberMasked}
            />

            <SupportRecoveryDialog open={recoveryOpen} onOpenChange={setRecoveryOpen} />

            <Toaster position="top-right" offset="80px" gap={8} />

          </div>

        );

      }}

    </LicenseGate>

  );

}



export default function App() {

  return (

    <NextThemeProvider>

      <ThemeProvider>

        <AuthProvider>

          <BusinessSettingsProvider>

            <AppUpdateProvider>

              <ReceiptPreviewProvider>

                <AppContent />

              </ReceiptPreviewProvider>

            </AppUpdateProvider>

          </BusinessSettingsProvider>

        </AuthProvider>

      </ThemeProvider>

    </NextThemeProvider>

  );

}

