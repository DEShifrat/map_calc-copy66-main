import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { useMap } from '@/context/MapContext';
import OnboardingDialog from '@/components/OnboardingDialog'; // Импорт OnboardingDialog
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"; // Импорт Tooltip

// Define the structure for the saved configuration (same as in MapContext.tsx)
interface SavedMapConfig {
  mapImageSrc: string;
  mapWidthMeters: number;
  mapHeightMeters: number;
  beacons: any[]; // Using any[] for simplicity, actual types are in MapContext
  antennas: any[];
  barriers: any[];
  zones: any[];
  switches: any[];
  cableDucts: any[];
  cablePricePerMeter?: number;
  defaultBeaconPrice?: number;
  defaultAntennaPrice?: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { actions } = useMap();

  const [mapImageFile, setMapImageFile] = useState<File | null>(null);
  const [mapWidthInput, setMapWidthInput] = useState<number>(100);
  const [mapHeightInput, setMapHeightInput] = useState<number>(100);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setMapImageFile(event.target.files[0]);
      showSuccess('Файл карты выбран.');
    } else {
      setMapImageFile(null);
      actions.setMapImageSrc(null);
    }
  };

  const handleLoadMap = () => {
    if (mapImageFile && mapWidthInput > 0 && mapHeightInput > 0) {
      const reader = new FileReader();
      reader.onloadend = () => {
        actions.resetMapData();
        actions.setMapImageSrc(reader.result as string);
        actions.setMapDimensions(mapWidthInput, mapHeightInput);
        showSuccess('Карта загружена и готова к использованию!');
        navigate('/technology-selection');
      };
      reader.onerror = () => {
        showError('Ошибка при чтении файла карты.');
      };
      reader.readAsDataURL(mapImageFile);
    } else {
      showError('Пожалуйста, выберите файл карты и укажите корректные размеры.');
    }
  };

  const handleLoadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      showError('Файл не выбран.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const loadedConfig: SavedMapConfig = JSON.parse(content);

        actions.loadMapConfiguration(loadedConfig);

        showSuccess('Конфигурация карты загружена из файла!');
        navigate('/technology-selection');
      } catch (error) {
        console.error('Ошибка при чтении или парсинге файла конфигурации:', error);
        showError('Не удалось загрузить конфигурацию карты. Убедитесь, что файл корректен.');
      }
    };
    reader.onerror = () => {
      showError('Ошибка при чтении файла.');
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-200 dark:bg-gray-900 p-4 py-8">
      <OnboardingDialog
        title="Добро пожаловать в приложение для планирования карт!"
        description={
          <>
            <p className="mb-2">Это приложение поможет вам создавать и управлять картами для различных технологий отслеживания.</p>
            <p className="mb-2">Начните с загрузки изображения вашей карты и указания её реальных размеров в метрах.</p>
            <p>Вы также можете загрузить ранее сохраненную конфигурацию карты из JSON файла.</p>
          </>
        }
        localStorageKey="onboarding_index_page"
      />
      <Card className="w-full max-w-3xl shadow-lg bg-gray-100 dark:bg-gray-900">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Управление картами и BLE-маяками</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="mapImage">Загрузить файл карты (изображение)</Label>
              <Input id="mapImage" type="file" accept="image/*" onChange={handleFileChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapWidth">Ширина карты (метры)</Label>
              <Input
                id="mapWidth"
                type="number"
                value={mapWidthInput}
                onChange={(e) => setMapWidthInput(Number(e.target.value))}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapHeight">Высота карты (метры)</Label>
              <Input
                id="mapHeight"
                type="number"
                value={mapHeightInput}
                onChange={(e) => setMapHeightInput(Number(e.target.value))}
                min="1"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleLoadMap} className="md:col-span-3">
                  Загрузить карту
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Загружает выбранное изображение как карту с указанными размерами.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="p-4 border rounded-md flex flex-wrap gap-2 justify-center">
            <h3 className="text-lg font-semibold w-full text-center mb-2">Загрузка файла конфигурации:</h3>
            <div className="space-y-2 flex-grow">
              <Label htmlFor="loadConfigFile" className="sr-only">Загрузить файл конфигурации</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input id="loadConfigFile" type="file" accept=".json" onChange={handleLoadFile} className="w-full" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Загружает ранее сохраненную конфигурацию карты из JSON файла.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default Index;