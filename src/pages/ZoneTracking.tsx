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
import { showSuccess, showError } from '@/utils/toast';
import { Coordinate } from 'ol/coordinate';
import Polygon from 'ol/geom/Polygon';
import {
  Square, Trash2, Target, Router, Pencil, Cable, Ruler, X, Undo2, Redo2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [isRescaleDialogOpen, setIsRescaleDialogOpen] = useState(false);
  const [drawnLengthForRescale, setDrawnLengthForRescale] = useState(0);
  const [zoneSizeInput, setZoneSizeInput] = useState<number>(10);

  const handleInteractionChange = (interaction: MapInteractionType) => {
    setActiveInteraction(prev => (prev === interaction ? null : interaction));
  };

  const handleFeatureAdd = useCallback((type: 'beacon' | 'antenna' | 'barrier' | 'zone' | 'switch' | 'cableDuct', featureData: any) => {
    if (type === 'barrier') {
      actions.setBarriers([...barriers, featureData]);
    } else if (type === 'zone') {
      actions.setZones([...zones, featureData]);
    } else if (type === 'switch') {
      actions.setSwitches([...switches, featureData]);
    } else if (type === 'cableDuct') {
      actions.setCableDucts([...cableDucts, featureData]);
    }
    setActiveInteraction(null);
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
    setActiveInteraction(null);
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
        position: [b.position[0] * scaleFactor, b.position[1] * scaleFactor],
      })));
      actions.setAntennas(antennas.map(a => ({
        ...a,
        position: [a.position[0] * scaleFactor, a.position[1] * scaleFactor],
        range: a.range * scaleFactor,
      })));
      actions.setBarriers(barriers.map(barrier => barrier.map(ring => ring.map(coord => [coord[0] * scaleFactor, coord[1] * scaleFactor]))));
      actions.setZones(zones.map(zone => ({
        ...zone,
        polygon: zone.polygon.map(ring => ring.map(coord => [coord[0] * scaleFactor, coord[1] * scaleFactor])),
      })));
      actions.setSwitches(switches.map(s => ({
        ...s,
        position: [s.position[0] * scaleFactor, s.position[1] * scaleFactor],
      })));
      actions.setCableDucts(cableDucts.map(c => ({
        ...c,
        path: c.path.map(coord => [coord[0] * scaleFactor, coord[1] * scaleFactor]),
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

    const newZones: typeof zones = [];
    const autoGeneratedBeacons: typeof beacons = [];
    let currentZoneId = zones.length > 0 ? Math.max(...zones.map(z => parseInt(z.id.split('-')[1]))) + 1 : 1;
    let currentBeaconId = beacons.length > 0 ? Math.max(...beacons.map(b => parseInt(b.id.split('-')[1]))) + 1 : 1;

    for (let y = 0; y < mapHeightMeters; y += zoneSizeInput) {
      for (let x = 0; x < mapWidthMeters; x += zoneSizeInput) {
        const x1 = x;
        const y1 = y;
        const x2 = Math.min(x + zoneSizeInput, mapWidthMeters);
        const y2 = Math.min(y + zoneSizeInput, mapHeightMeters);

        const polygonCoords: Coordinate[][][] = [[
          [x1, y1],
          [x2, y1],
          [x2, y2],
          [x1, y2],
          [x1, y1] // Close the polygon
        ]];

        const olPolygon = new Polygon(polygonCoords[0]);
        const centerCoordinate = olPolygon.getInteriorPoint().getCoordinates();

        newZones.push({
          id: `zone-${currentZoneId++}`,
          polygon: polygonCoords,
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
    <div className="min-h-screen flex flex-col items-center bg-gray-200 dark:bg-gray-900 p-4">
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
                <div className="grid grid-cols-3 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('drawBarrier')}
                        variant={activeInteraction === 'drawBarrier' ? 'default' : 'outline'}
                        size="icon"
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Нарисовать барьер</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('deleteBarrier')}
                        variant={activeInteraction === 'deleteBarrier' ? 'destructive' : 'outline'}
                        size="icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Удалить барьер</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('drawZone')}
                        variant={activeInteraction === 'drawZone' ? 'default' : 'outline'}
                        size="icon"
                      >
                        <Target className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Нарисовать зону</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('deleteZone')}
                        variant={activeInteraction === 'deleteZone' ? 'destructive' : 'outline'}
                        size="icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Удалить зону</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('manualSwitch')}
                        variant={activeInteraction === 'manualSwitch' ? 'default' : 'outline'}
                        size="icon"
                      >
                        <Router className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Добавить коммутатор</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('editSwitch')}
                        variant={activeInteraction === 'editSwitch' ? 'default' : 'outline'}
                        size="icon"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Редактировать коммутатор</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('deleteSwitch')}
                        variant={activeInteraction === 'deleteSwitch' ? 'destructive' : 'outline'}
                        size="icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Удалить коммутатор</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('drawCableDuct')}
                        variant={activeInteraction === 'drawCableDuct' ? 'default' : 'outline'}
                        size="icon"
                      >
                        <Cable className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Нарисовать кабель-канал</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('editCableDuct')}
                        variant={activeInteraction === 'editCableDuct' ? 'default' : 'outline'}
                        size="icon"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Редактировать кабель-канал</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('deleteCableDuct')}
                        variant={activeInteraction === 'deleteCableDuct' ? 'destructive' : 'outline'}
                        size="icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Удалить кабель-канал</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => handleInteractionChange('rescale')}
                        variant={activeInteraction === 'rescale' ? 'default' : 'outline'}
                        size="icon"
                      >
                        <Ruler className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ремасштабировать карту</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => setActiveInteraction(null)} variant="secondary" size="icon">
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Отменить действие</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={actions.undo} disabled={!actions.canUndo} variant="outline" size="icon">
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Отменить</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={actions.redo} disabled={!actions.canRedo} variant="outline" size="icon">
                        <Redo2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Вернуть</p>
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
                  <Button onClick={handleAutoCalculateZones} className="w-full">
                    Авторасчет зон
                  </Button>
                  <Button onClick={handleClearZonesAndBeacons} variant="destructive" className="w-full">
                    Очистить зоны и маяки
                  </Button>
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