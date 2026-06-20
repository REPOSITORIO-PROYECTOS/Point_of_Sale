import { useEffect, useState } from "react";

import { POSScreenEnhanced } from "./components/pos/POSScreenEnhanced";

import { ParcelsView } from "./components/parcels/ParcelsView";

import { ImportExportView } from "./components/inventory/ImportExportView";

import { AuditView } from "./components/audit/AuditView";

import { LoginView } from "./components/auth/LoginView";

import { Header } from "./components/layout/Header";

import { AppVersionFooter } from "./components/layout/AppVersionFooter";

import { LicenseRequiredView } from "./components/license/LicenseRequiredView";

import { SupportRecoveryDialog } from "./components/support/SupportRecoveryDialog";

import { Toaster } from "./components/ui/sonner";

import { ThemeProvider as NextThemeProvider } from "./components/theme-provider";

import { ThemeProvider } from "../lib/theme-context";

import { AuthProvider, useAuth } from "../lib/auth-context";

import { BusinessSettingsProvider, useBusinessSettings } from "../lib/business-settings-context";

import { LicenseExpiryBanner, LicenseGate } from "../lib/license-context";

import { HeldOrder } from "./components/pos/OrderQueuePanel";



function AppContent() {

  const { user, isLoading } = useAuth();

  const { settings: businessSettings } = useBusinessSettings();

  const [activeTab, setActiveTab] = useState("pos");

  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

  const [recoveryOpen, setRecoveryOpen] = useState(false);



  const handleClearOrders = () => {

    setHeldOrders([]);

  };

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

          return <LoginView />;

        }



        return (

          <div className="size-full flex flex-col bg-background">

            {license && <LicenseExpiryBanner license={license} />}

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

              {activeTab === "inventory" && user.role === "admin" && <ImportExportView />}

              {activeTab === "audit" && user.role === "admin" && (

                <AuditView

                  heldOrdersCount={heldOrders.length}

                  onRequestClearOrders={handleClearOrders}

                />

              )}

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

            <AppContent />

          </BusinessSettingsProvider>

        </AuthProvider>

      </ThemeProvider>

    </NextThemeProvider>

  );

}

