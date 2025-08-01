import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TechnologySelection from "./pages/TechnologySelection";
import ZoneTracking from "./pages/ZoneTracking";
import BLEBeacons from "./pages/BLEBeacons";
import AOAAntennas from "./pages/AOAAntennas";
import { MapProvider } from "./context/MapContext"; // Импорт MapProvider

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MapProvider> {/* Оборачиваем Routes в MapProvider */}
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/technology-selection" element={<TechnologySelection />} />
            <Route path="/zone-tracking" element={<ZoneTracking />} />
            <Route path="/ble-beacons" element={<BLEBeacons />} />
            <Route path="/aoa-antennas" element={<AOAAntennas />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MapProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;