import React, { useState, useCallback } from 'react';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import MapDisplay from '@/components/MapDisplay';
import { showSuccess, showError } from '@/utils/toast';

interface Beacon {
  id: string;
  position: [number, number]; // [x, y] in map coordinates (meters)
  rssi?: number;
  price?: number; // Добавлено поле price
}

interface Antenna {
  id: string;
  position: [number, number]; // [x, y] in map coordinates (meters)
  height: number; // Height of installation in meters
  angle: number; // Angle of algorithm operation (degrees)
  range: number; // Coverage radius in meters
  price?: number; // Добавлено поле price
}

interface Zone { // Новое определение интерфейса Zone
  id: string;
  polygon: [number, number][][][]; // Polygon coordinates
  beaconCount: number;
}

interface Switch { // Новый интерфейс для коммутатора
  id: string;
  position: [number, number]; // [x, y] in map coordinates (meters)
}

interface CableDuct { // Новый интерфейс для кабель-канала (бывший Cable)
  id: string;
  path: [number, number][]; // Массив координат для линии кабель-канала
  type: 'main' | 'connection'; // НОВОЕ: Тип кабель-канала
}

// Define the structure for the saved configuration
interface SavedMapConfig {
  mapImageSrc: string;
  mapWidthMeters: number;
  mapHeightMeters: number;
  beacons: Beacon[];
  antennas: Antenna[];
  barriers: [number, number][][][]; // Array of Polygon coordinates
  zones: Zone[]; // Добавлено для сохранения зон
  switches: Switch[]; // НОВОЕ: Добавлено для сохранения коммутаторов
  cableDucts: CableDuct[]; // НОВОЕ: Добавлено для сохранения кабель-каналов (бывшие cables)
  cablePricePerMeter?: number; // Цена за метр кабель-канала
  defaultBeaconPrice?: number; // Цена маяка по умолчанию
  defaultAntennaPrice?: number; // Цена антенны по умолчанию
}

const Index = () => {
  const [mapImageFile, setMapImageFile] = useState<File | null>(null);
  const [mapImageSrc, setMapImageSrc] = useState<string | null>(null);
  const [mapWidth, setMapWidth] = useState<number>(100); // Default width in meters
  const [mapHeight, setMapHeight] = useState<number>(100); // Default height in meters
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [antennas, setAntennas] = useState<Antenna[]>([]); // State for antennas
  const [barriers, setBarriers] = useState<[number, number][][][]>([]); // State for barriers
  const [zones, setZones] = useState<Zone[]>([]); // Новое состояние для зон
  const [switches, setSwitches] = useState<Switch[]>([]); // НОВОЕ: Состояние для коммутаторов
  const [cableDucts, setCableDucts] = useState<CableDuct[]>([]); // НОВОЕ: Состояние для кабель-каналов (бывшие cables)
  const [cablePricePerMeter, setCablePricePerMeter] = useState<number>(1); // Цена за метр кабель-канала по умолчанию
  const [beaconPrice, setBeaconPrice] = useState<number>(10); // Цена маяка по умолчанию
  const [antennaPrice, setAntennaPrice] = useState<number>(50); // Цена антенны по умолчанию

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
        setSwitches([]); // НОВОЕ: Очищаем коммутаторы
        setCableDucts([]); // НОВОЕ: Очищаем кабель-каналы
        showSuccess('Карта загружена и готова к использованию!');
      };
      reader.onerror = () => {
        showError('Ошибка при чтении файла карты.');
      };
      reader.readAsDataURL(mapImageFile);
    } else {
      showError('Пожалуйста, выберите файл карты и укажите корректные размеры.');
    }
  };

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

  const handleSwitchesChange = useCallback((newSwitches: Switch[]) => { // НОВОЕ: Обработчик для коммутаторов
    setSwitches(newSwitches);
  }, []);

  const handleCableDuctsChange = useCallback((newCableDucts: CableDuct[]) => { // НОВОЕ: Обработчик для кабель-каналов
    setCableDucts(newCableDucts);
  }, []);

  // New handler for map dimensions change, passed to MapDisplay
  const handleMapDimensionsChange = useCallback((newWidth: number, newHeight: number) => {
    setMapWidth(newWidth);
    setMapHeight(newHeight);
  }, []);

  // Function to be called by MapDisplay to trigger save
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
      switches, // НОВОЕ: Включаем коммутаторы в сохраняемую конфигурацию
      cableDucts, // НОВОЕ: Включаем кабель-каналы в сохраняемую конфигурацию
      cablePricePerMeter, // Сохраняем цену за метр кабель-канала
      defaultBeaconPrice: beaconPrice, // Сохраняем цену маяка по умолчанию
      defaultAntennaPrice: antennaPrice, // Сохраняем цену антенны по умолчанию
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
  }, [mapImageSrc, mapWidth, mapHeight, beacons, antennas, barriers, zones, switches, cableDucts, cablePricePerMeter, beaconPrice, antennaPrice]); // Добавляем switches и cableDucts в зависимости

  // Function to handle loading from a file
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

        // Update Index.tsx state
        setMapImageSrc(loadedConfig.mapImageSrc);
        setMapWidth(loadedConfig.mapWidthMeters);
        setMapHeight(loadedConfig.mapHeightMeters);
        setBeacons(loadedConfig.beacons || []);
        setAntennas(loadedConfig.antennas || []);
        setBarriers(loadedConfig.barriers || []);
        setZones(loadedConfig.zones || []);
        // При загрузке старых конфигов, где не было 'type', присваиваем 'main' по умолчанию
        setSwitches(loadedConfig.switches || []); 
        setCableDucts(loadedConfig.cableDucts?.map(duct => ({ ...duct, type: duct.type || 'main' })) || []); 
        setCablePricePerMeter(loadedConfig.cablePricePerMeter ?? 1); // Загружаем цену за метр кабель-канала, по умолчанию 1
        setBeaconPrice(loadedConfig.defaultBeaconPrice ?? 10); // Загружаем цену маяка по умолчанию
        setAntennaPrice(loadedConfig.defaultAntennaPrice ?? 50); // Загружаем цену антенны по умолчанию

        showSuccess('Конфигурация карты загружена из файла!');
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

          {mapImageSrc && mapWidth > 0 && mapHeight > 0 ? (
            <MapDisplay
              mapImageSrc={mapImageSrc}
              mapWidthMeters={mapWidth}
              mapHeightMeters={mapHeight}
              onBeaconsChange={handleBeaconsChange}
              initialBeacons={beacons}
              onAntennasChange={handleAntennasChange}
              initialAntennas={antennas}
              onBarriersChange={handleBarriersChange}
              initialBarriers={barriers}
              onZonesChange={handleZonesChange}
              initialZones={zones}
              onSwitchesChange={handleSwitchesChange} // НОВОЕ: Передаем обработчик для коммутаторов
              initialSwitches={switches} // НОВОЕ: Передаем начальные коммутаторы
              onCableDuctsChange={handleCableDuctsChange} // НОВОЕ: Передаем обработчик для кабель-каналов
              initialCableDucts={cableDucts} // НОВОЕ: Передаем начальные кабель-каналы
              onSaveConfiguration={triggerSaveConfiguration}
              onMapDimensionsChange={handleMapDimensionsChange}
              beaconPrice={beaconPrice}
              onBeaconPriceChange={setBeaconPrice}
              antennaPrice={antennaPrice}
              onAntennaPriceChange={setAntennaPrice}
              cablePricePerMeter={cablePricePerMeter}
              onCablePricePerMeterChange={setCablePricePerMeter}
            />
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Пожалуйста, загрузите карту, чтобы начать размещение маяков.
            </div>
          )}

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