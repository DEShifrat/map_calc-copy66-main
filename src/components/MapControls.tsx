import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { Map, View } from 'ol';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import { get as getProjection, Projection } from 'ol/proj';
import { getCenter } from 'ol/extent';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import LineString from 'ol/geom/LineString';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import CircleStyle from 'ol/style/Circle';
import Text from 'ol/style/Text';
import { Coordinate } from 'ol/coordinate';

// Интерфейсы для данных карты (повторяются из MapContext для ясности)
interface Beacon {
  id: string;
  position: Coordinate;
  rssi?: number;
  price?: number;
}

interface Antenna {
  id: string;
  position: Coordinate;
  height: number;
  angle: number;
  range: number;
  price?: number;
}

interface Zone {
  id: string;
  polygon: Coordinate[][][];
  beaconCount: number;
}

interface Switch {
  id: string;
  position: Coordinate;
}

interface CableDuct {
  id: string;
  path: Coordinate[];
  type: 'main' | 'connection';
}

interface MapControlsProps {
  mapImageSrc: string | null;
  mapWidthMeters: number;
  mapHeightMeters: number;
  beacons: Beacon[];
  antennas: Antenna[];
  barriers: Coordinate[][][][];
  zones: Zone[];
  switches: Switch[];
  cableDucts: CableDuct[];
  showBeacons: boolean;
  showAntennas: boolean;
  showBarriers: boolean;
  showAntennaRanges: boolean;
  showZones: boolean;
  showSwitches: boolean;
  showCableDucts: boolean;
  showCableDuctLengths: boolean;
  toggleShowBeacons: () => void;
  toggleShowAntennas: () => void;
  toggleShowBarriers: () => void;
  toggleShowAntennaRanges: () => void;
  toggleShowZones: () => void;
  toggleShowSwitches: () => void;
  toggleShowCableDucts: () => void;
  toggleShowCableDuctLengths: () => void;
  onSaveConfiguration: () => void;
  cablePricePerMeter: number;
}

// --- Стили, определенные за пределами компонента для избежания проблем с инициализацией ---
const beaconStyle = new Style({
  image: new Icon({
    anchor: [0.5, 1],
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" width="24px" height="24px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>',
    scale: 1.5,
  }),
});

const barrierStyle = new Style({
  fill: new Fill({
    color: 'rgba(255, 0, 0, 0.3)',
  }),
  stroke: new Stroke({
    color: 'red',
    width: 2,
  }),
});

const zoneStyle = new Style({
  fill: new Fill({
    color: 'rgba(0, 255, 0, 0.1)',
  }),
  stroke: new Stroke({
    color: 'green',
    width: 1,
  }),
});

const switchStyle = new Style({
  image: new Icon({
    anchor: [0.5, 1],
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="purple" width="24px" height="24px"><path d="M19 1H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-1 14h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zM8 5h8v2H8V5zm0 4h8v2H8V9zm0 4h8v2H8v-2z"/></svg>',
    scale: 1.5,
  }),
});

const cableDuctLineStyle = new Style({
  stroke: new Stroke({
    color: 'orange',
    width: 3,
    lineDash: [5, 5],
  }),
});

const getAntennaStyle = (feature: Feature, showAntennaRanges: boolean) => {
  const range = feature.get('range');
  const position = feature.getGeometry()?.getCoordinates();

  const styles: Style[] = [
    new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="blue" width="24px" height="24px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>',
        scale: 1.5,
      }),
    }),
  ];

  if (showAntennaRanges) {
    if (position && range !== undefined) {
      styles.push(
        new Style({
          geometry: new Circle(position, range),
          fill: new Fill({
            color: 'rgba(0, 0, 255, 0.1)',
          }),
          stroke: new Stroke({
            color: 'blue',
            width: 1,
          }),
        })
      );
    }
  }
  return styles;
};

const getCableDuctStyle = (feature: Feature, showCableDuctLengths: boolean) => {
  const styles: Style[] = [cableDuctLineStyle];

  if (showCableDuctLengths) {
    const geometry = feature.getGeometry();
    if (geometry instanceof LineString) {
      const coordinates = geometry.getCoordinates();
      for (let i = 0; i < coordinates.length - 1; i++) {
        const p1 = coordinates[i];
        const p2 = coordinates[i + 1];

        const segmentLength = Math.sqrt(
          Math.pow(p2[0] - p1[0], 2) +
          Math.pow(p2[1] - p1[1], 2)
        );

        const midpoint: Coordinate = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];

        styles.push(new Style({
          geometry: new Point(midpoint),
          text: new Text({
            text: `${segmentLength.toFixed(2)} м`,
            font: '12px Calibri,sans-serif',
            fill: new Fill({ color: 'black' }),
            stroke: new Stroke({ color: 'white', width: 3 }),
            offsetY: -10,
            placement: 'point',
          }),
        }));
      }
    }
  }
  return styles;
};
// --- Конец стилей ---

// Helper function to calculate the length of a single cable duct
const calculateCableDuctLength = (path: Coordinate[]): number => {
  let length = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    length += Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
  }
  return length;
};

// Helper to calculate length along a LineString between two points on it.
// This function approximates by finding the closest vertices to the given points
// and summing the lengths of segments between those vertices. It's an approximation
// and might not be perfectly accurate if points fall in the middle of long segments.
const calculateLengthBetweenPointsOnLineString = (
    lineString: LineString,
    point1: Coordinate,
    point2: Coordinate
): number => {
    const coords = lineString.getCoordinates();
    if (coords.length < 2) return 0;

    // Find the closest vertices to point1 and point2
    let closestIdx1 = -1;
    let closestDist1 = Infinity;
    let closestIdx2 = -1;
    let closestDist2 = Infinity;

    for (let i = 0; i < coords.length; i++) {
        const distToP1 = Math.sqrt(
            Math.pow(coords[i][0] - point1[0], 2) + Math.pow(coords[i][1] - point1[1], 2)
        );
        const distToP2 = Math.sqrt(
            Math.pow(coords[i][0] - point2[0], 2) + Math.pow(coords[i][1] - point2[1], 2)
        );

        if (distToP1 < closestDist1) {
            closestDist1 = distToP1;
            closestIdx1 = i;
        }
        if (distToP2 < closestDist2) {
            closestDist2 = distToP2;
            closestIdx2 = i;
        }
    }

    if (closestIdx1 === -1 || closestIdx2 === -1) return 0; // Should not happen if points are on the line

    // If points are very close to the same vertex, consider length 0
    // Using a small tolerance (e.g., 0.1 meters)
    if (closestIdx1 === closestIdx2 && closestDist1 < 0.1 && closestDist2 < 0.1) return 0;

    let segmentLength = 0;
    const startIdx = Math.min(closestIdx1, closestIdx2);
    const endIdx = Math.max(closestIdx1, closestIdx2);

    for (let i = startIdx; i < endIdx; i++) {
        segmentLength += Math.sqrt(
            Math.pow(coords[i+1][0] - coords[i][0], 2) +
            Math.pow(coords[i+1][1] - coords[i][1], 2)
        );
    }
    return segmentLength;
};


const MapControls: React.FC<MapControlsProps> = ({
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
  toggleShowBeacons,
  toggleShowAntennas,
  toggleShowBarriers,
  toggleShowAntennaRanges,
  toggleShowZones,
  toggleShowSwitches,
  toggleShowCableDucts,
  toggleShowCableDuctLengths,
  onSaveConfiguration,
  cablePricePerMeter,
}) => {

  const handleExportMapToPNG = () => {
    if (!mapImageSrc || mapWidthMeters <= 0 || mapHeightMeters <= 0) {
      showError('Карта не загружена или размеры некорректны.');
      return;
    }

    const exportDiv = document.createElement('div');
    const exportResolution = 10; // Pixels per meter for export
    exportDiv.style.width = `${mapWidthMeters * exportResolution}px`;
    exportDiv.style.height = `${mapHeightMeters * exportResolution}px`;
    exportDiv.style.position = 'absolute';
    exportDiv.style.top = '-9999px';
    document.body.appendChild(exportDiv);

    const imageExtent = [0, 0, mapWidthMeters, mapHeightMeters];
    const imageProjection = new Projection({
      code: 'pixel',
      units: 'pixels',
      extent: imageExtent,
    });

    const imageLayer = new ImageLayer({
      source: new ImageStatic({
        url: mapImageSrc,
        imageExtent: imageExtent,
        projection: imageProjection,
      }),
    });

    const exportBeaconLayer = new VectorLayer({
      source: new VectorSource({ features: beacons.map(b => new Feature({ geometry: new Point(b.position), id: b.id })) }),
      style: beaconStyle,
    });
    exportBeaconLayer.setVisible(showBeacons);

    const exportAntennaLayer = new VectorLayer({
      source: new VectorSource({ features: antennas.map(a => new Feature({ geometry: new Point(a.position), id: a.id, range: a.range })) }),
      style: (feature) => getAntennaStyle(feature, showAntennaRanges),
    });
    exportAntennaLayer.setVisible(showAntennas);

    const exportBarrierLayer = new VectorLayer({
      source: new VectorSource({ features: barriers.map(b => new Feature({ geometry: new Polygon(b) })) }),
      style: barrierStyle,
    });
    exportBarrierLayer.setVisible(showBarriers);

    const exportZoneLayer = new VectorLayer({
      source: new VectorSource({ features: zones.map(z => new Feature({ geometry: new Polygon(z.polygon), id: z.id, beaconCount: z.beaconCount })) }),
      style: zoneStyle,
    });
    exportZoneLayer.setVisible(showZones);

    const exportSwitchLayer = new VectorLayer({
      source: new VectorSource({ features: switches.map(s => new Feature({ geometry: new Point(s.position), id: s.id })) }),
      style: switchStyle,
    });
    exportSwitchLayer.setVisible(showSwitches);

    const exportCableDuctLayer = new VectorLayer({
      source: new VectorSource({ features: cableDucts.map(c => new Feature({ geometry: new LineString(c.path), id: c.id, type: c.type })) }),
      style: (feature) => getCableDuctStyle(feature, showCableDuctLengths),
    });
    exportCableDuctLayer.setVisible(showCableDucts);

    const exportMap = new Map({
      target: exportDiv,
      layers: [
        imageLayer,
        exportBeaconLayer,
        exportAntennaLayer,
        exportBarrierLayer,
        exportZoneLayer,
        exportSwitchLayer,
        exportCableDuctLayer,
      ],
      view: new View({
        projection: imageProjection,
        center: getCenter(imageExtent),
        zoom: 0,
      }),
    });

    exportMap.getView().fit(imageExtent, { size: exportMap.getSize() });

    exportMap.once('rendercomplete', () => {
      try {
        const exportCanvas = exportDiv.querySelector('canvas') as HTMLCanvasElement;
        if (!exportCanvas) {
          showError('Не удалось найти холст для экспорта.');
          return;
        }

        const link = document.createElement('a');
        link.download = 'map_export.png';
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
        showSuccess('Карта успешно экспортирована в PNG!');
      } catch (error) {
        console.error('Ошибка при экспорте карты:', error);
        showError('Ошибка при экспорте карты. Возможно, из-за ограничений безопасности браузера (CORS) для изображений.');
      } finally {
        exportMap.setTarget(undefined);
        document.body.removeChild(exportDiv);
      }
    });

    exportMap.renderSync();
  };

  // Calculate total cable duct length
  const totalCableDuctLength = React.useMemo(() => {
    let totalLength = 0;
    cableDucts.forEach(cableDuct => {
      totalLength += calculateCableDuctLength(cableDuct.path);
    });
    return totalLength;
  }, [cableDucts]);

  // Calculate conditional cable duct length based on the provided formula
  const conditionalCableDuctLength = React.useMemo(() => {
    let totalLength = 0;

    // 1. Add lengths of all connection cable ducts
    cableDucts.filter(duct => duct.type === 'connection').forEach(connDuct => {
        totalLength += calculateCableDuctLength(connDuct.path);
    });

    // 2. For each antenna, calculate the length along the main duct to the nearest switch
    antennas.forEach(antenna => {
        // Find the connection duct for this antenna
        const antennaConnectionDuct = cableDucts.find(duct =>
            duct.type === 'connection' &&
            (
                (duct.path[0][0] === antenna.position[0] && duct.path[0][1] === antenna.position[1]) ||
                (duct.path[1][0] === antenna.position[0] && duct.path[1][1] === antenna.position[1])
            )
        );

        if (antennaConnectionDuct) {
            // Determine the point on the main duct where the connection duct ends
            const pointOnMainDuct = (antennaConnectionDuct.path[0][0] === antenna.position[0] && antennaConnectionDuct.path[0][1] === antenna.position[1])
                ? antennaConnectionDuct.path[1]
                : antennaConnectionDuct.path[0];

            // Find the main duct that contains this connection point
            const connectedMainDuct = cableDucts.find(duct =>
                duct.type === 'main' &&
                new LineString(duct.path).getClosestPoint(pointOnMainDuct).every((val, i) => Math.abs(val - pointOnMainDuct[i]) < 0.01) // Check if point is on the line with tolerance
            );

            if (connectedMainDuct) {
                // Find the nearest switch's projection onto this main duct
                let nearestSwitchPointOnMainDuct: Coordinate | null = null;
                let minSwitchDistanceToDuct = Infinity;

                const mainDuctGeometry = new LineString(connectedMainDuct.path);

                switches.forEach(s => {
                    const switchPos = s.position;
                    const closestPointOnMainDuctToSwitch = mainDuctGeometry.getClosestPoint(switchPos);
                    const distance = Math.sqrt(
                        Math.pow(switchPos[0] - closestPointOnMainDuctToSwitch[0], 2) +
                        Math.pow(switchPos[1] - closestPointOnMainDuctToSwitch[1], 2)
                    );

                    if (distance < minSwitchDistanceToDuct) {
                        minSwitchDistanceToDuct = distance;
                        nearestSwitchPointOnMainDuct = closestPointOnMainDuctToSwitch;
                    }
                });

                if (nearestSwitchPointOnMainDuct) {
                    // Calculate length along the main duct from pointOnMainDuct to nearestSwitchPointOnMainDuct
                    const segmentLength = calculateLengthBetweenPointsOnLineString(
                        mainDuctGeometry,
                        pointOnMainDuct,
                        nearestSwitchPointOnMainDuct
                    );
                    totalLength += segmentLength;
                }
            }
        }
    });

    return totalLength;
  }, [cableDucts, switches, antennas]);

  const totalMapArea = mapWidthMeters * mapHeightMeters;
  const totalBarrierArea = barriers.reduce((sum, coords) => {
    const polygon = new Polygon(coords);
    return sum + polygon.getArea();
  }, 0);
  const movableArea = totalMapArea - totalBarrierArea;

  // Расчет общей стоимости оборудования
  const totalBeaconCost = beacons.reduce((sum, beacon) => sum + (beacon.price || 0), 0);
  const totalAntennaCost = antennas.reduce((sum, antenna) => sum + (antenna.price || 0), 0);
  const totalEquipmentCost = totalBeaconCost + totalAntennaCost + totalCableDuctCost;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      <div className="p-4 border rounded-md flex flex-wrap gap-2 justify-center">
        <h3 className="text-lg font-semibold w-full text-center mb-2">Управление конфигурацией:</h3>
        <Button onClick={handleExportMapToPNG} variant="secondary">
          Экспорт карты в PNG
        </Button>
        <Button onClick={onSaveConfiguration} variant="default">
          Сохранить конфигурацию
        </Button>
      </div>

      <div className="p-4 border rounded-md grid grid-cols-1 sm:grid-cols-2 gap-4">
        <h3 className="text-lg font-semibold col-span-full text-center mb-2">Инструменты карты и слои:</h3>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showBeacons"
            checked={showBeacons}
            onCheckedChange={(checked) => toggleShowBeacons()}
          />
          <Label htmlFor="showBeacons">Показать маяки</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showAntennas"
            checked={showAntennas}
            onCheckedChange={(checked) => toggleShowAntennas()}
          />
          <Label htmlFor="showAntennas">Показать антенны</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showBarriers"
            checked={showBarriers}
            onCheckedChange={(checked) => toggleShowBarriers()}
          />
          <Label htmlFor="showBarriers">Показать барьеры</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showAntennaRanges"
            checked={showAntennaRanges}
            onCheckedChange={(checked) => toggleShowAntennaRanges()}
          />
          <Label htmlFor="showAntennaRanges">Показать радиус антенн</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showZones"
            checked={showZones}
            onCheckedChange={(checked) => toggleShowZones()}
          />
          <Label htmlFor="showZones">Показать зоны</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showSwitches"
            checked={showSwitches}
            onCheckedChange={(checked) => toggleShowSwitches()}
          />
          <Label htmlFor="showSwitches">Показать коммутаторы</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showCableDucts"
            checked={showCableDucts}
            onCheckedChange={(checked) => toggleShowCableDucts()}
          />
          <Label htmlFor="showCableDucts">Показать кабель-каналы</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showCableDuctLengths"
            checked={showCableDuctLengths}
            onCheckedChange={(checked) => toggleShowCableDuctLengths()}
          />
          <Label htmlFor="showCableDuctLengths">Показать длину кабеля</Label>
        </div>
      </div>

      <div className="p-4 border rounded-md grid grid-cols-1 md:grid-cols-3 gap-4">
        <h3 className="text-lg font-semibold col-span-full">Статистика карты:</h3>
        <div>
          <Label>Общая площадь карты:</Label>
          <p className="text-lg font-medium">{totalMapArea.toFixed(2)} м²</p>
        </div>
        <div>
          <Label>Площадь барьеров:</Label>
          <p className="text-lg font-medium">{totalBarrierArea.toFixed(2)} м²</p>
        </div>
        <div>
          <Label>Площадь перемещений:</Label>
          <p className="text-lg font-medium">{movableArea.toFixed(2)} м²</p>
        </div>
        <div>
          <Label>Количество маяков:</Label>
          <p className="text-lg font-medium">{beacons.length}</p>
        </div>
        <div>
          <Label>Количество антенн:</Label>
          <p className="text-lg font-medium">{antennas.length}</p>
        </div>
        <div>
          <Label>Количество зон:</Label>
          <p className="text-lg font-medium">{zones.length}</p>
        </div>
        <div>
          <Label>Количество коммутаторов:</Label>
          <p className="text-lg font-medium">{switches.length}</p>
        </div>
        <div>
          <Label>Количество кабель-каналов:</Label>
          <p className="text-lg font-medium">{cableDucts.length}</p>
        </div>
        <div>
          <Label>Общая длина кабель-канала:</Label>
          <p className="text-lg font-medium">{totalCableDuctLength.toFixed(2)} м</p>
        </div>
        <div>
          <Label>Условная длина кабеля:</Label>
          <p className="text-lg font-medium">{conditionalCableDuctLength.toFixed(2)} м</p>
        </div>
        <div>
          <Label>Среднее маяков/зону:</Label>
          <p className="text-lg font-medium">
            {zones.length > 0 ? (beacons.length / zones.length).toFixed(2) : '0.00'}
          </p>
        </div>
        <div>
          <Label>Стоимость кабеля:</Label>
          <p className="text-lg font-medium">{totalCableDuctCost.toFixed(2)} ед.</p>
        </div>
        <div className="col-span-full">
          <Label>Общая стоимость оборудования:</Label>
          <p className="text-lg font-bold text-blue-600">{totalEquipmentCost.toFixed(2)} ед.</p>
        </div>
      </div>
    </div>
  );
};

export default MapControls;