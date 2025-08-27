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
import { MapProvider, useMap } from "./context/MapContext";
import React, { useEffect, useRef } from "react"; // Импорт useRef

const queryClient = new QueryClient();

// Компонент для управления автосохранением
const AutoSaveManager = () => {
  const { state, actions } = useMap();
  const { isAutoSaveEnabled, autoSaveIntervalMinutes } = state;
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Очищаем предыдущий интервал, если он существует
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Устанавливаем новый интервал, если автосохранение включено и интервал корректен
    if (isAutoSaveEnabled && autoSaveIntervalMinutes > 0) {
      const intervalId = setInterval(() => {
        actions.saveMapConfigurationToLocalStorage();
      }, autoSaveIntervalMinutes * 60 * 1000); // Минуты в миллисекунды
      intervalRef.current = intervalId as unknown as number; // Приведение типа для setInterval
    }

    // Очищаем интервал при размонтировании компонента или изменении зависимостей
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAutoSaveEnabled, autoSaveIntervalMinutes, actions]);

  return null; // Этот компонент ничего не рендерит
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MapProvider> {/* Оборачиваем Routes в MapProvider */}
          <AutoSaveManager /> {/* Добавляем компонент для автосохранения */}
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