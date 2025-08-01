import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Импортируем useNavigate
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';

// Определения интерфейсов (оставляем их здесь, так как Index.tsx будет управлять общим состоянием)
interface Beacon {
  id: string;
  position: [number, number]; // [x, y] in map coordinates (meters)
  rssi?: number;
  price?: number;
}

interface Antenna {
  id: string;
  position: [number, number]; // [x, y] in map coordinates (meters)
  height: number;
  angle: number;
  range: number;
  price?: number;
}

interface Zone {
  id: string;
  polygon: [number, number][][][];
  beaconCount: number;
}

interface Switch {
  id: string;
  position: [number, number];
}

interface CableDuct {
  id: string;
  path: [number, number][];
  type: 'main' | 'connection';
}

// Define the structure for the saved configuration
interface SavedMapConfig {
  mapImageSrc: string;
  mapWidthMeters: number;
  mapHeightMeters: number;
  beacons: Beacon[];
  antennas: Antenna[];
  barriers: [number, number][][][];
  zones: Zone[];
  switches: Switch[];
  cableDucts: CableDuct[];
  cablePricePerMeter?: number;
  defaultBeaconPrice?: number;
  defaultAntennaPrice?: number;
}

const Index = () => {
  const navigate = useNavigate(); // Инициализируем useNavigate
  const [mapImageFile, setMapImageFile] = useState<File | null>(null);
  const [mapImageSrc, setMapImageSrc] = useState<string | null>(null);
  const [mapWidth, setMapWidth] = useState<number>(100);
  const [mapHeight, setMapHeight] = useState<number>(100);
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [antennas, setAntennas] = useState<Antenna[]>([]);
  const [barriers, setBarriers] = useState<[number, number][][][]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [switches, setSwitches] = useState<Switch[]>([]);
  const [cableDucts, setCableDucts] = useState<CableDuct[]>([]);
  const [cablePricePerMeter, setCablePricePerMeter] = useState<number>(1);
  const [beaconPrice, setBeaconPrice] = useState<number>(10);
  const [antennaPrice, setAntennaPrice] = useState<number>(50);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setMapImageFile(event.target.files[0]);
      showSuccess('Файл карты выбран.');
    } else {
      setMapImageFile(null);
      setMapImageSrc(null);
    }
  };

  const handleLoadMap = () => {
    if (mapImageFile && mapWidth > 0 && mapHeight > 0) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMapImageSrc(reader.result as string);
        setBeacons([]); // Clear beacons when a new map is loaded
        setAntennas([]); // Clear antennas
        setBarriers([]); // Clear barriers
        setZones([]); // Очищаем зоны при загрузке новой карты
        setSwitches([]); // Очищаем коммутаторы
        setCableDucts([]); // Очищаем кабель-каналы
        showSuccess('Карта загружена и готова к использованию!');
        navigate('/technology-selection'); // Перенаправляем на страницу выбора технологии
      };
      reader.onerror = () => {
        showError('Ошибка при чтении файла карты.');
      };
      reader.readAsDataURL(mapImageFile);
    } else {
      showError('Пожалуйста, выберите файл карты и укажите корректные размеры.');
    }
  };

  // Эти обработчики пока остаются здесь, но их вызовы будут изменены
  const handleBeaconsChange = useCallback((newBeacons: Beacon[]) => {
    setBeacons(newBeacons);
  }, []);

  const handleAntennasChange = useCallback((newAntennas: Antenna[]) => {
    setAntennas(newAntennas);
  }, []);

  const handleBarriersChange = useCallback((newBarriers: [number, number][][][]) => {
    setBarriers(newBarriers);
  }, []);

  const handleZonesChange = useCallback((newZones: Zone[]) => {
    setZones(newZones);
  }, []);

  const handleSwitchesChange = useCallback((newSwitches: Switch[]) => {
    setSwitches(newSwitches);
  }, []);

  const handleCableDuctsChange = useCallback((newCableDucts: CableDuct[]) => {
    setCableDucts(newCableDucts);
  }, []);

  const handleMapDimensionsChange = useCallback((newWidth: number, newHeight: number) => {
    setMapWidth(newWidth);
    setMapHeight(newHeight);
  }, []);

  const triggerSaveConfiguration = useCallback(() => {
    if (!mapImageSrc || mapWidth <= 0 || mapHeight <= 0) {
      showError('Невозможно сохранить: карта не загружена или размеры некорректны.');
      return;
    }

    const config: SavedMapConfig = {
      mapImageSrc,
      mapWidthMeters: mapWidth,
      mapHeightMeters: mapHeight,
      beacons,
      antennas,
      barriers,
      zones,
      switches,
      cableDucts,
      cablePricePerMeter,
      defaultBeaconPrice: beaconPrice,
      defaultAntennaPrice: antennaPrice,
    };

    try {
      const jsonString = JSON.stringify(config, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'map_configuration.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess('Конфигурация карты сохранена в файл!');
    } catch (error) {
      console.error('Ошибка при сохранении конфигурации в файл:', error);
      showError('Не удалось сохранить конфигурацию карты в файл.');
    }
  }, [mapImageSrc, mapWidth, mapHeight, beacons, antennas, barriers, zones, switches, cableDucts, cablePricePerMeter, beaconPrice, antennaPrice]);

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

        setMapImageSrc(loadedConfig.mapImageSrc);
        setMapWidth(loadedConfig.mapWidthMeters);
        setMapHeight(loadedConfig.mapHeightMeters);
        setBeacons(loadedConfig.beacons || []);
        setAntennas(loadedConfig.antennas || []);
        setBarriers(loadedConfig.barriers || []);
        setZones(loadedConfig.zones || []);
        setSwitches(loadedConfig.switches || []);
        setCableDucts(loadedConfig.cableDucts?.map(duct => ({ ...duct, type: duct.type || 'main' })) || []);
        setCablePricePerMeter(loadedConfig.cablePricePerMeter ?? 1);
        setBeaconPrice(loadedConfig.defaultBeaconPrice ?? 10);
        setAntennaPrice(loadedConfig.defaultAntennaPrice ?? 50);

        showSuccess('Конфигурация карты загружена из файла!');
        navigate('/technology-selection'); // Перенаправляем на страницу выбора технологии
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-900 p-4">
      <Card className="w-full shadow-lg bg-gray-100 dark:bg-gray-900">
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
                value={mapWidth}
                onChange={(e) => setMapWidth(Number(e.target.value))}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapHeight">Высота карты (метры)</Label>
              <Input
                id="mapHeight"
                type="number"
                value={mapHeight}
                onChange={(e) => setMapHeight(Number(e.target.value))}
                min="1"
              />
            </div>
            <Button onClick={handleLoadMap} className="md:col-span-3">
              Загрузить карту
            </Button>
          </div>

          {/* New section for file-based save/load */}
          <div className="p-4 border rounded-md flex flex-wrap gap-2 justify-center">
            <h3 className="text-lg font-semibold w-full text-center mb-2">Загрузка файла конфигурации:</h3>
            <div className="space-y-2 flex-grow">
              <Label htmlFor="loadConfigFile" className="sr-only">Загрузить файл конфигурации</Label>
              <Input id="loadConfigFile" type="file" accept=".json" onChange={handleLoadFile} className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default Index;