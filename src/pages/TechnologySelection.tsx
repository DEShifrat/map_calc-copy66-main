"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OnboardingDialog from '@/components/OnboardingDialog'; // Импорт OnboardingDialog
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Импорт Tooltip

const TechnologySelection: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-200 dark:bg-gray-900 p-4 py-8">
      <OnboardingDialog
        title="Выберите технологию"
        description={
          <>
            <p className="mb-2">Теперь, когда карта загружена, выберите технологию, с которой вы хотите работать.</p>
            <p>Каждая технология предлагает свой набор инструментов для размещения объектов и анализа.</p>
          </>
        }
        localStorageKey="onboarding_technology_selection_page"
      />
      <Card className="w-full max-w-2xl shadow-lg bg-gray-100 dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Выберите технологию для работы с картой</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 flex flex-col items-center">
          <p className="text-center text-gray-700 dark:text-gray-300">
            Выберите один из вариантов для настройки и анализа вашей карты.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/zone-tracking">
                  <Button className="w-full h-24 text-lg font-semibold">
                    Зональный трекинг
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Настройка зон и размещение BLE-маяков для зонального отслеживания.</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/ble-beacons">
                  <Button className="w-full h-24 text-lg font-semibold">
                    BLE маяки
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Размещение и управление отдельными BLE-маяками на карте.</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/aoa-antennas">
                  <Button className="w-full h-24 text-lg font-semibold">
                    AOA антенны
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Размещение AOA-антенн, коммутаторов и кабель-каналов для точного позиционирования.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/">
                <Button variant="outline" className="mt-4">
                  Вернуться к загрузке карты
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>Вернуться на главную страницу для загрузки новой карты или конфигурации.</p>
            </TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechnologySelection;