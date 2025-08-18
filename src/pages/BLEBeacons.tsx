import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMap } from '@/context/MapContext';
import MapCore, { MapInteractionType } from '@/components/MapCore';
import MapControls from '@/components/MapControls';
import RescaleDialog from '@/components/RescaleDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showSuccess, showError } from '@/utils/toast';
import { Coordinate } from 'ol/coordinate';
import { isPointInsideAnyBarrier } from '@/lib/utils';
import {
  MapPin, Pencil, Trash2, Square, Ruler, X, Undo2, Redo2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import OnboardingDialog from '@/components/OnboardingDialog'; // Импорт OnboardingDialog

const BLEBeacons: React.FC = () => {
  const { state, actions } = useMap();
  const {
    mapImageSrc,
    mapWidthMeters,
    mapHeightMeters,
    beacons,
    antennas,
    barriers,
    zones,
    switches,
    cableDucts,
    showBeacons,
    showAntennas,
    showBarriers,
    showAntennaRanges,
    showZones,
    showSwitches,
    showCableDucts,
    showCableDuctLengths,
    beaconPrice,
    antennaPrice,
    cablePricePerMeter,
  } = state;

  const [activeInteraction, setActiveInteraction] = useState<MapInteractionType>(null);
  const [isRescaleDialogOpen, setIsRescaleDialogOpen] = useState<boolean>(false);
  const [drawnLengthForRescale, setDrawnLengthForRescale] = useState(0);
  const [beaconStepInput, setBeaconStepInput] = useState<number>(5);
  const [beaconPlacementType, setBeaconPlacementType] = useState<'row' | 'chessboard' | 'triangular' | 'adaptive'>('row');

  const handleInteractionChange = (interaction: MapInteractionType) => {
    setActiveInteraction(prev => (prev === interaction ? null : interaction));
  };

  const handleFeatureAdd = useCallback((type: 'beacon' | 'antenna' | 'barrier' | 'zone' | 'switch' | 'cableDuct', featureData: any) => {
    if (type === 'beacon') {
      actions.setBeacons([...beacons, featureData]);
    } else if (type === 'barrier') {
      actions.setBarriers([...barriers, featureData]);
      setActiveInteraction(null);
    } else {
      setActiveInteraction(null);
    }
  }, [actions, beacons, barriers]);

  const handleFeatureModify = useCallback((type: 'beacon' | 'antenna' | 'switch' | 'cableDuct' | 'barrier', id: string, newPosition: Coordinate | Coordinate[] | Coordinate[][]) => {
    if (type === 'beacon') {
      actions.setBeacons(beacons.map(b => b.id === id ? { ...b, position: newPosition as Coordinate } : b));
    } else if (type === 'barrier') {
      // Для барьеров 'id' - это JSON.stringify(oldCoords), а newPosition - это newCoords
      const oldBarrierId = id; // id уже является JSON.stringify(oldCoords)
      actions.updateBarrier(oldBarrierId, newPosition as Coordinate[][]);
    } else {
      setActiveInteraction(null);
    }
  }, [actions, beacons]);

  const handleFeatureDelete = useCallback((type: 'beacon' | 'antenna' | 'zone' | 'barrier' | 'switch' | 'cableDuct', id: string) => {
    if (type === 'beacon') {
      actions.setBeacons(beacons.filter(b => b.id !== id));
    } else if (type === 'barrier') {
      actions.setBarriers(barriers.filter(b => JSON.stringify(b) !== id));
    }
  }, [actions, beacons, barriers]);

  const handleRescaleDrawEnd = useCallback((drawnLength: number) => {
    setDrawnLengthForRescale(drawnLength);
    setIsRescaleDialogOpen(true);
    setActiveInteraction(null);
  }, []);

  const handleRescaleConfirm = useCallback((realWorldLength: number) => {
    if (drawnLengthForRescale > 0 && realWorldLength > 0) {
      const scaleFactor = realWorldLength / drawnLengthForRescale;
      const newWidth = mapWidthMeters * scaleFactor;
      const newHeight = mapHeightMeters * scaleFactor;

      actions.setMapDimensions(newWidth, newHeight);

      actions.setBeacons(beacons.map(b => ({
        ...b,
        position: [b.position[0] * scaleFactor, b.position[1] * scaleFactor] as Coordinate,
      })));
      actions.setAntennas(antennas.map(a => ({
        ...a,
        position: [a.position[0] * scaleFactor, a.position[1] * scaleFactor] as Coordinate,
        range: a.range * scaleFactor,
      })));
      actions.setBarriers(barriers.map(barrier => barrier.map(ring => ring.map(coord => [coord[0] * scaleFactor, coord[1] * scaleFactor] as Coordinate))));
      actions.setZones(zones.map(zone => ({
        ...zone,
        polygon: zone.polygon.map(ring => ring.map(coord => [coord[0] * scaleFactor, coord[1] * scaleFactor] as Coordinate)),
      })));
      actions.setSwitches(switches.map(s => ({
        ...s,
        position: [s.position[0] * scaleFactor, s.position[1] * scaleFactor] as Coordinate,
      })));
      actions.setCableDucts(cableDucts.map(c => ({
        ...c,
        path: c.path.map(coord => [coord[0] * scaleFactor, coord[1] * scaleFactor] as Coordinate),
      })));

      showSuccess(`Карта ремасштабирована. Новые размеры: ${newWidth.toFixed(2)}м x ${newHeight.toFixed(2)}м`);
    } else {
      showError('Некорректные значения для ремасштабирования.');
    }
    setIsRescaleDialogOpen(false);
  }, [drawnLengthForRescale, mapWidthMeters, mapHeightMeters, beacons, antennas, barriers, zones, switches, cableDucts, actions]);

  const handleSaveConfiguration = useCallback(() => {
    if (!mapImageSrc || mapWidthMeters <= 0 || mapHeightMeters <= 0) {
      showError('Невозможно сохранить: карта не загружена или размеры некорректны.');
      return;
    }

    const config = {
      mapImageSrc,
      mapWidthMeters,
      mapHeightMeters,
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
  }, [mapImageSrc, mapWidthMeters, mapHeightMeters, beacons, antennas, barriers, zones, switches, cableDucts, cablePricePerMeter, beaconPrice, antennaPrice]);

  const handleAutoCalculateBeacons = () => {
    if (beaconStepInput <= 0) {
      showError('Шаг маяков должен быть положительным числом.');
      return;
    }

    const newBeacons: typeof beacons = [];
    let currentId = beacons.length > 0 ? Math.max(...beacons.map(b => parseInt(b.id.split('-')[1]))) + 1 : 1;

    const step = beaconStepInput;
    const sqrt3_2 = Math.sqrt(3) / 2;

    for (let y = 0; y < mapHeightMeters; y += (beaconPlacementType === 'triangular' ? step * sqrt3_2 : step)) {
      for (let x = 0; x < mapWidthMeters; x += step) {
        let currentX = x;
        let currentY = y;

        if (beaconPlacementType === 'chessboard' && Math.floor(y / step) % 2 !== 0) {
          currentX += step / 2;
        } else if (beaconPlacementType === 'triangular' && Math.floor(y / (step * sqrt3_2)) % 2 !== 0) {
          currentX += step / 2;
        }

        if (currentX >= 0 && currentX <= mapWidthMeters && currentY >= 0 && currentY <= mapHeightMeters) {
          const newBeaconPosition: Coordinate = [currentX, currentY];

          if (!isPointInsideAnyBarrier(newBeaconPosition, barriers)) {
            newBeacons.push({
              id: `beacon-${currentId++}`,
              position: newBeaconPosition,
              price: beaconPrice,
            });
          }
        }
      }
    }
    actions.setBeacons(newBeacons);
    showSuccess(`Автоматически создано ${newBeacons.length} маяков.`);
    setActiveInteraction(null);
  };

  const handleClearBeacons = () => {
    actions.setBeacons([]);
    showSuccess('Все маяки удалены.');
    setActiveInteraction(null);
  };

  if (!mapImageSrc) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md shadow-lg bg-gray-100 dark:bg-gray-900 text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Карта не загружена</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Пожалуйста, загрузите карту на главной странице, чтобы начать работу.
            </p>
            <Link to="/">
              <Button>Перейти к загрузке карты</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-200 dark:bg-gray-900 p-4 py-8">
      <OnboardingDialog
        title="Работа с BLE-маяками"
        description={
          <>
            <p className="mb-2">На этой странице вы можете размещать и управлять BLE-маяками на вашей карте.</p>
            <p className="mb-2">Используйте инструменты рисования для добавления маяков вручную, редактирования их позиций или удаления.</p>
            <p className="mb-2">Функция "Авторасчет маяков" позволяет автоматически разместить маяки по заданному шагу и типу расстановки, избегая барьеров.</p>
            <p>Не забудьте сохранить вашу конфигурацию, чтобы не потерять изменения!</p>
          </>
        }
        localStorageKey="onboarding_ble_beacons_page"
      />
      <Card className="w-full max-w-6xl shadow-lg bg-gray-100 dark:bg-gray-900 mb-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">BLE маяки</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <MapCore
                mapImageSrc={mapImageSrc}
                mapWidthMeters={mapWidthMeters}
                mapHeightMeters={mapHeightMeters}
                beacons={beacons}
                antennas={antennas}
                barriers={barriers}
                zones={zones}
                switches={switches}
                cableDucts={cableDucts}
                showBeacons={showBeacons}
                showAntennas={showAntennas}
                showBarriers={showBarriers}
                showAntennaRanges={showAntennaRanges}
                showZones={showZones}
                showSwitches={showSwitches}
                showCableDucts={showCableDucts}
                showCableDuctLengths={showCableDuctLengths}
                activeInteraction={activeInteraction}
                onFeatureAdd={handleFeatureAdd}
                onFeatureModify={handleFeatureModify}
                onFeatureDelete={handleFeatureDelete}
                onRescaleDrawEnd={handleRescaleDrawEnd}
                beaconPrice={beaconPrice}
                antennaPrice={antennaPrice}
              />
            </div>

            <div className="md:col-span-1 space-y-4">
              <div className="p-4 border rounded-md">
                <h3 className="text-lg font-semibold mb-2">Инструменты рисования и редактирования:</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('manualBeacon')}
                        variant={activeInteraction === 'manualBeacon' ? 'default' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <MapPin className="h-4 w-4" />
                        <span className="truncate text-xs sm:text-sm">Добавить маяк</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Добавить новый маяк на карту, кликнув по желаемому месту.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('editBeacon')}
                        variant={activeInteraction === 'editBeacon' ? 'default' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="truncate text-xs sm:text-sm">Редактировать маяк</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Переместить существующий маяк на карте.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('deleteBeacon')}
                        variant={activeInteraction === 'deleteBeacon' ? 'destructive' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="truncate text-xs sm:text-sm">Удалить маяк</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Удалить маяк с карты, кликнув по нему.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('drawBarrier')}
                        variant={activeInteraction === 'drawBarrier' ? 'default' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Square className="h-4 w-4" />
                        <span className="truncate text-xs sm:text-sm">Нарисовать барьер</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Нарисовать область, недоступную для размещения объектов.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('editBarrier')}
                        variant={activeInteraction === 'editBarrier' ? 'default' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="truncate text-xs sm:text-sm">Редактировать барьер</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Изменить форму существующего барьера.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('deleteBarrier')}
                        variant={activeInteraction === 'deleteBarrier' ? 'destructive' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="truncate text-xs sm:text-sm">Удалить барьер</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Удалить нарисованный барьер с карты.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('rescale')}
                        variant={activeInteraction === 'rescale' ? 'default' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Ruler className="h-4 w-4" />
                        <span className="truncate text-xs sm:text-sm">Ремасштабировать карту</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Изменить масштаб карты, нарисовав отрезок и указав его реальную длину.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveInteraction(null)} variant="default" className="flex items-center justify-start gap-2 px-4 h-10">
                        <X className="h-4 w-4" />
                        <span className="truncate text-xs sm:text-sm">Отключить режим рисования</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Отключить текущий активный режим рисования или редактирования.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={actions.undo} disabled={!actions.canUndo} variant="outline" className="flex items-center justify-start gap-2 px-4 h-10">
                        <Undo2 className="h-4 w-4" />
                        <span className="truncate text-xs sm:text-sm">Отменить</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Отменить последнее действие.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={actions.redo} disabled={!actions.canRedo} variant="outline" className="flex items-center justify-start gap-2 px-4 h-10">
                        <Redo2 className="h-4 w-4" />
                        <span className="truncate text-xs sm:text-sm">Вернуть</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Повторить отмененное действие.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="p-4 border rounded-md">
                <h3 className="text-lg font-semibold mb-2">Авторасчет маяков:</h3>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="beaconStep">Шаг размещения маяков (м)</Label>
                  <Input
                    id="beaconStep"
                    type="number"
                    value={beaconStepInput}
                    onChange={(e) => setBeaconStepInput(Number(e.target.value))}
                    min="1"
                    step="1"
                  />
                </div>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="beaconPlacementType">Тип расстановки</Label>
                  <Select
                    value={beaconPlacementType}
                    onValueChange={(value: 'row' | 'chessboard' | 'triangular' | 'adaptive') => setBeaconPlacementType(value)}
                  >
                    <SelectTrigger id="beaconPlacementType">
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="row">Строчный</SelectItem>
                      <SelectItem value="chessboard">Шахматный</SelectItem>
                      <SelectItem value="triangular">Треугольный</SelectItem>
                      <SelectItem value="adaptive">Адаптивный (с учетом барьеров)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleAutoCalculateBeacons} className="w-full">
                        <span className="truncate text-xs sm:text-sm">Авторасчет маяков</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Автоматически размещает маяки по всей карте с учетом барьеров, используя заданный шаг и тип расстановки.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleClearBeacons} variant="destructive" className="w-full">
                        <span className="truncate text-xs sm:text-sm">Очистить маяки</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Удаляет все маяки с карты.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="p-4 border rounded-md">
                <h3 className="text-lg font-semibold mb-2">Настройки цен:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="beaconPrice">Цена маяка (ед.)</Label>
                    <Input
                      id="beaconPrice"
                      type="number"
                      value={beaconPrice}
                      onChange={(e) => actions.setBeaconPrice(Number(e.target.value))}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="antennaPrice">Цена антенны (ед.)</Label>
                    <Input
                      id="antennaPrice"
                      type="number"
                      value={antennaPrice}
                      onChange={(e) => actions.setAntennaPrice(Number(e.target.value))}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-2 col-span-full">
                    <Label htmlFor="cablePricePerMeter">Цена кабеля за метр (ед./м)</Label>
                    <Input
                      id="cablePricePerMeter"
                      type="number"
                      value={cablePricePerMeter}
                      onChange={(e) => actions.setCablePricePerMeter(Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <MapControls
            mapImageSrc={mapImageSrc}
            mapWidthMeters={mapWidthMeters}
            mapHeightMeters={mapHeightMeters}
            beacons={beacons}
            antennas={antennas}
            barriers={barriers}
            zones={zones}
            switches={switches}
            cableDucts={cableDucts}
            showBeacons={showBeacons}
            showAntennas={showAntennas}
            showBarriers={showBarriers}
            showAntennaRanges={showAntennaRanges}
            showZones={showZones}
            showSwitches={showSwitches}
            showCableDucts={showCableDucts}
            showCableDuctLengths={showCableDuctLengths}
            toggleShowBeacons={actions.toggleShowBeacons}
            toggleShowAntennas={actions.toggleShowAntennas}
            toggleShowBarriers={actions.toggleShowBarriers}
            toggleShowAntennaRanges={actions.toggleShowAntennaRanges}
            toggleShowZones={actions.toggleShowZones}
            toggleShowSwitches={actions.toggleShowSwitches}
            toggleShowCableDucts={actions.toggleShowCableDucts}
            toggleShowCableDuctLengths={actions.toggleShowCableDuctLengths}
            onSaveConfiguration={handleSaveConfiguration}
            cablePricePerMeter={cablePricePerMeter}
          />

          <Link to="/technology-selection" className="flex justify-center mt-4">
            <Button variant="outline">
              Вернуться к выбору технологии
            </Button>
          </Link>
        </CardContent>
      </Card>

      <RescaleDialog
        isOpen={isRescaleDialogOpen}
        onClose={() => setIsRescaleDialogOpen(false)}
        onConfirm={handleRescaleConfirm}
        drawnLengthMeters={drawnLengthForRescale}
      />
    </div>
  );
};

export default BLEBeacons;