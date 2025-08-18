import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMap, Zone } from '@/context/MapContext';
import MapCore, { MapInteractionType } from '@/components/MapCore';
import MapControls from '@/components/MapControls';
import RescaleDialog from '@/components/RescaleDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { Coordinate } from 'ol/coordinate';
import Polygon from 'ol/geom/Polygon';
import {
  Square, Trash2, Target, Router, Pencil, Cable, Ruler, X, Undo2, Redo2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import OnboardingDialog from '@/components/OnboardingDialog'; // Импорт OnboardingDialog

const ZoneTracking: React.FC = () => {
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
  const [zoneSizeInput, setZoneSizeInput] = useState<number>(10);

  const handleInteractionChange = (interaction: MapInteractionType) => {
    setActiveInteraction(prev => (prev === interaction ? null : interaction));
  };

  const handleFeatureAdd = useCallback((type: 'beacon' | 'antenna' | 'barrier' | 'zone' | 'switch' | 'cableDuct', featureData: any) => {
    if (type === 'barrier') {
      actions.setBarriers([...barriers, featureData]);
      setActiveInteraction(null); // Deactivate after one barrier draw
    } else if (type === 'zone') {
      actions.setZones([...zones, featureData]);
      setActiveInteraction(null); // Deactivate after one zone draw
    } else if (type === 'switch') {
      actions.setSwitches([...switches, featureData]);
      // Do NOT deactivate for manual switch placement
    } else if (type === 'cableDuct') {
      actions.setCableDucts([...cableDucts, featureData]);
      setActiveInteraction(null); // Deactivate after one cable duct draw
    }
  }, [actions, barriers, zones, switches, cableDucts]);

  const handleFeatureModify = useCallback((type: 'beacon' | 'antenna' | 'switch' | 'cableDuct', id: string, newPosition: Coordinate | Coordinate[]) => {
    if (type === 'beacon') {
      actions.setBeacons(beacons.map(b => b.id === id ? { ...b, position: newPosition as Coordinate } : b));
    } else if (type === 'antenna') {
      actions.setAntennas(antennas.map(a => a.id === id ? { ...a, position: newPosition as Coordinate } : a));
    } else if (type === 'switch') {
      actions.setSwitches(switches.map(s => s.id === id ? { ...s, position: newPosition as Coordinate } : s));
    } else if (type === 'cableDuct') {
      actions.setCableDucts(cableDucts.map(c => c.id === id ? { ...c, path: newPosition as Coordinate[] } : c));
    }
    setActiveInteraction(null);
  }, [actions, beacons, antennas, switches, cableDucts]);

  const handleFeatureDelete = useCallback((type: 'beacon' | 'antenna' | 'zone' | 'barrier' | 'switch' | 'cableDuct', id: string) => {
    if (type === 'beacon') {
      actions.setBeacons(beacons.filter(b => b.id !== id));
    } else if (type === 'antenna') {
      actions.setAntennas(antennas.filter(a => a.id !== id));
    } else if (type === 'zone') {
      actions.setZones(zones.filter(z => z.id !== id));
    } else if (type === 'barrier') {
      actions.setBarriers(barriers.filter(b => JSON.stringify(b) !== id));
    } else if (type === 'switch') {
      actions.setSwitches(switches.filter(s => s.id !== id));
    } else if (type === 'cableDuct') {
      actions.setCableDucts(cableDucts.filter(c => c.id !== id));
    }
    // Do NOT deactivate interaction for deletion
  }, [actions, beacons, antennas, zones, barriers, switches, cableDucts]);

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

  const handleAutoCalculateZones = () => {
    if (zoneSizeInput <= 0) {
      showError('Размер зоны должен быть положительным числом.');
      return;
    }

    const newZones: Zone[] = [];
    const autoGeneratedBeacons: typeof beacons = [];
    let currentZoneId = zones.length > 0 ? Math.max(...zones.map(z => parseInt(z.id.split('-')[1]))) + 1 : 1;
    let currentBeaconId = beacons.length > 0 ? Math.max(...beacons.map(b => parseInt(b.id.split('-')[1]))) + 1 : 1;

    for (let y = 0; y < mapHeightMeters; y += zoneSizeInput) {
      for (let x = 0; x < mapWidthMeters; x += zoneSizeInput) {
        const x1 = x;
        const y1 = y;
        const x2 = Math.min(x + zoneSizeInput, mapWidthMeters);
        const y2 = Math.min(y + zoneSizeInput, mapHeightMeters);

        const polygonCoords: Coordinate[] = [
          [x1, y1],
          [x2, y1],
          [x2, y2],
          [x1, y2],
          [x1, y1] // Close the polygon
        ];

        const olPolygon = new Polygon([polygonCoords]);
        const centerCoordinate = olPolygon.getInteriorPoint().getCoordinates();

        newZones.push({
          id: `zone-${currentZoneId++}`,
          polygon: [polygonCoords],
          beaconCount: 1,
        });

        autoGeneratedBeacons.push({
          id: `beacon-${currentBeaconId++}`,
          position: centerCoordinate,
          price: beaconPrice,
        });
      }
    }
    actions.setZones(newZones);
    actions.setBeacons([...beacons, ...autoGeneratedBeacons]);
    showSuccess(`Автоматически создано ${newZones.length} зон и ${autoGeneratedBeacons.length} маяков.`);
    setActiveInteraction(null);
  };

  const handleClearZonesAndBeacons = () => {
    actions.setZones([]);
    actions.setBeacons([]);
    showSuccess('Все зоны и маяки удалены.');
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
        title="Работа с зональным трекингом"
        description={
          <>
            <p className="mb-2">На этой странице вы можете создавать и управлять зонами отслеживания на вашей карте.</p>
            <p className="mb-2">Используйте инструменты рисования для добавления зон вручную, а также барьеров, коммутаторов и кабель-каналов.</p>
            <p className="mb-2">Функция "Авторасчет зон" позволяет автоматически разместить зоны по всей карте с заданным размером, а также добавить маяки в центр каждой зоны.</p>
            <p>Не забудьте сохранить вашу конфигурацию, чтобы не потерять изменения!</p>
          </>
        }
        localStorageKey="onboarding_zone_tracking_page"
      />
      <Card className="w-full max-w-6xl shadow-lg bg-gray-100 dark:bg-gray-900 mb-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Зональный трекинг</CardTitle>
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
                        onClick={() => handleInteractionChange('drawZone')}
                        variant={activeInteraction === 'drawZone' ? 'default' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Target className="h-4 w-4" />
                        <span>Нарисовать зону</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Нарисовать область для зонального отслеживания.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('deleteZone')}
                        variant={activeInteraction === 'deleteZone' ? 'destructive' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Удалить зону</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Удалить нарисованную зону с карты.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('manualSwitch')}
                        variant={activeInteraction === 'manualSwitch' ? 'default' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Router className="h-4 w-4" />
                        <span>Добавить коммутатор</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Добавить новый коммутатор на карту, кликнув по желаемому месту.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('editSwitch')}
                        variant={activeInteraction === 'editSwitch' ? 'default' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Pencil className="h-4 w-4" />
                        <span>Редактировать коммутатор</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Переместить существующий коммутатор на карте.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('deleteSwitch')}
                        variant={activeInteraction === 'deleteSwitch' ? 'destructive' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Удалить коммутатор</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Удалить коммутатор с карты, кликнув по нему.</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('drawCableDuct')}
                        variant={activeInteraction === 'drawCableDuct' ? 'default' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Cable className="h-4 w-4" />
                        <span>Нарисовать кабель-канал</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Нарисовать линию кабель-канала на карте.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('editCableDuct')}
                        variant={activeInteraction === 'editCableDuct' ? 'default' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Pencil className="h-4 w-4" />
                        <span>Редактировать кабель-канал</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Изменить форму существующего кабель-канала.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('deleteCableDuct')}
                        variant={activeInteraction === 'deleteCableDuct' ? 'destructive' : 'outline'}
                        className="flex items-center justify-start gap-2 px-4 h-10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Удалить кабель-канал</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Удалить кабель-канал или его отдельный сегмент.</p>
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
                        <span>Ремасштабировать карту</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Изменить масштаб карты, нарисовав отрезок и указав его реальную длину.</p>
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
                        <span>Нарисовать барьер</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Нарисовать область, недоступную для размещения объектов.</p>
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
                        <span>Удалить барьер</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Удалить нарисованный барьер с карты.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveInteraction(null)} variant="default" className="flex items-center justify-start gap-2 px-4 h-10">
                        <X className="h-4 w-4" />
                        <span>Отключить режим рисования</span>
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
                        <span>Отменить</span>
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
                        <span>Вернуть</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Повторить отмененное действие.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="p-4 border rounded-md">
                <h3 className="text-lg font-semibold mb-2">Авторасчет зон:</h3>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="zoneSize">Размер зоны (м)</Label>
                  <Input
                    id="zoneSize"
                    type="number"
                    value={zoneSizeInput}
                    onChange={(e) => setZoneSizeInput(Number(e.target.value))}
                    min="1"
                    step="1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleAutoCalculateZones} className="w-full">
                        Авторасчет зон
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Автоматически создает зоны заданного размера по всей карте и размещает маяки в их центрах.</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={handleClearZonesAndBeacons} variant="destructive" className="w-full">
                        Очистить зоны и маяки
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Удаляет все зоны и маяки с карты.</p>
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

export default ZoneTracking;