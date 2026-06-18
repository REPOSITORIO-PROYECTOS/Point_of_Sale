import { useState } from "react";
import { POSScreenEnhanced } from "./components/pos/POSScreenEnhanced";
import { ParcelsView } from "./components/parcels/ParcelsView";
import { ImportExportView } from "./components/inventory/ImportExportView";
import { AuditView } from "./components/audit/AuditView";
import { LoginView } from "./components/auth/LoginView";
import { Header } from "./components/layout/Header";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider as NextThemeProvider } from "./components/theme-provider";
import { ThemeProvider } from "../lib/theme-context";
import { AuthProvider, useAuth } from "../lib/auth-context";
import { HeldOrder } from "./components/pos/OrderQueuePanel";

function AppContent() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("pos");
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);

  const handleClearOrders = () => {
    setHeldOrders([]);
  };

  if (isLoading) {
    return (
      <div className="size-full flex items-center justify-center bg-background text-muted-foreground">
        Cargando sesión...
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="size-full flex flex-col bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-hidden">
        {activeTab === "pos" && (
          <POSScreenEnhanced
            heldOrders={heldOrders}
            onHeldOrdersChange={setHeldOrders}
          />
        )}
        {activeTab === "parcels" && user.role === "admin" && <ParcelsView />}
        {activeTab === "inventory" && user.role === "admin" && <ImportExportView />}
        {activeTab === "audit" && user.role === "admin" && (
          <AuditView
            heldOrdersCount={heldOrders.length}
            onRequestClearOrders={handleClearOrders}
          />
        )}
      </div>

      <Toaster position="top-right" offset="80px" gap={8} />
    </div>
  );
}

export default function App() {
  return (
    <NextThemeProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </NextThemeProvider>
  );
}
