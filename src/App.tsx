import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TechnologySelection from "./pages/TechnologySelection"; // Импорт новой страницы
import ZoneTracking from "./pages/ZoneTracking"; // Импорт новой страницы
import BLEBeacons from "./pages/BLEBeacons"; // Импорт новой страницы
import AOAAntennas from "./pages/AOAAntennas"; // Импорт новой страницы

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/technology-selection" element={<TechnologySelection />} />
          <Route path="/zone-tracking" element={<ZoneTracking />} />
          <Route path="/ble-beacons" element={<BLEBeacons />} />
          <Route path="/aoa-antennas" element={<AOAAntennas />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;