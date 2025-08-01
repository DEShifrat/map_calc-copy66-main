import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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
import Circle from 'ol/geom/Circle';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import CircleStyle from 'ol/style/Circle';
import Text from 'ol/style/Text';
import { Coordinate } from 'ol/coordinate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { showSuccess, showError } from '@/utils/toast';
import { Draw, Modify, Snap, Interaction } from 'ol/interaction';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import RescaleDialog from './RescaleDialog';

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

const sketchStyle = new Style({
  fill: new Fill({
    color: 'rgba(255, 255, 255, 0.2)',
  }),
  stroke: new Stroke({
    color: 'rgba(255, 0, 0, 0.7)',
    width: 2,
  }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({
      color: 'rgba(255, 0, 0, 0.7)',
    }),
    stroke: new Stroke({
      color: 'rgba(255, 255, 255, 0.8)',
      width: 1,
    }),
  }),
});

const rescaleLineStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(255, 165, 0, 0.7)',
    width: 3,
  }),
});

const hoverStyle = new Style({
  stroke: new Stroke({
    color: 'cyan',
    width: 3,
  }),
  image: new CircleStyle({
    radius: 10,
    stroke: new Stroke({
      color: 'cyan',
      width: 3,
    }),
    fill: new Fill({
      color: 'rgba(0, 255, 255, 0.1)',
    }),
  }),
});

const zoneHoverStyle = new Style({
  stroke: new Stroke({
    color: 'orange',
    width: 3,
  }),
  fill: new Fill({
    color: 'rgba(255, 165, 0, 0.2)',
  }),
});
// --- Конец стилей, определенных за пределами компонента ---


interface Beacon {
  id: string;
  position: Coordinate; // [x, y] in map coordinates (meters)
  rssi?: number;
  price?: number; // Добавлено поле price
}

interface Antenna {
  id: string;
  position: Coordinate; // [x, y] in map coordinates (meters)
  height: number; // Height of installation in meters
  angle: number; // Angle of algorithm operation (degrees)
  range: number; // Coverage radius in meters
  price?: number; // Добавлено поле price
}

interface Zone {
  id: string;
  polygon: Coordinate[][][]; // Polygon coordinates
  beaconCount: number;
}

interface Switch { // НОВЫЙ интерфейс для коммутатора
  id: string;
  position: Coordinate; // [x, y] in map coordinates (meters)
}

interface CableDuct { // НОВЫЙ интерфейс для кабель-канала (бывший Cable)
  id: string;
  path: Coordinate[]; // Массив координат для линии кабель-канала
  type: 'main' | 'connection'; // НОВОЕ: Тип кабель-канала
}

interface MapDisplayProps {
  mapImageSrc: string;
  mapWidthMeters: number;
  mapHeightMeters: number;
  onBeaconsChange: (beacons: Beacon[]) => void;
  initialBeacons?: Beacon[];
  onAntennasChange: (antennas: Antenna[]) => void;
  initialAntennas?: Antenna[];
  onBarriersChange: (barriers: Coordinate[][][]) => void;
  initialBarriers?: Coordinate[][][];
  onZonesChange: (zones: Zone[]) => void;
  initialZones?: Zone[];
  onSwitchesChange: (switches: Switch[]) => void; // НОВОЕ свойство
  initialSwitches?: Switch[]; // НОВОЕ свойство
  onCableDuctsChange: (cableDucts: CableDuct[]) => void; // НОВОЕ свойство
  initialCableDucts?: CableDuct[]; // НОВОЕ свойство
  onSaveConfiguration: () => void;
  onMapDimensionsChange: (width: number, height: number) => void;
  beaconPrice: number;
  onBeaconPriceChange: (price: number) => void;
  antennaPrice: number;
  onAntennaPriceChange: (price: number) => void;
  cablePricePerMeter: number;
  onCablePricePerMeterChange: (price: number) => void;
}

const MapDisplay: React.FC<MapDisplayProps> = ({
  mapImageSrc,
  mapWidthMeters,
  mapHeightMeters,
  onBeaconsChange,
  initialBeacons = [],
  onAntennasChange,
  initialAntennas = [],
  onBarriersChange,
  initialBarriers = [],
  onZonesChange,
  initialZones = [],
  onSwitchesChange, // Принимаем
  initialSwitches = [], // Принимаем
  onCableDuctsChange, // Принимаем
  initialCableDucts = [], // Принимаем
  onSaveConfiguration,
  onMapDimensionsChange,
  beaconPrice,
  onBeaconPriceChange,
  antennaPrice,
  onAntennaPriceChange,
  cablePricePerMeter,
  onCablePricePerMeterChange,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [beacons, setBeacons] = useState<Beacon[]>(initialBeacons);
  const [antennas, setAntennas] = useState<Antenna[]>(initialAntennas);
  const [barriers, setBarriers] = useState<Coordinate[][][][]>(initialBarriers);
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [switches, setSwitches] = useState<Switch[]>(initialSwitches); // НОВОЕ состояние
  const [cableDucts, setCableDucts] = useState<CableDuct[]>(initialCableDucts); // НОВОЕ состояние

  const [isManualBeaconPlacementMode, setIsManualBeaconPlacementMode] = useState(false);
  const [isManualAntennaPlacementMode, setIsManualAntennaPlacementMode] = useState(false);
  const [isDrawingBarrierMode, setIsDrawingBarrierMode] = useState(false);
  const [isDrawingZoneMode, setIsDrawingZoneMode] = useState(false);
  const [isManualSwitchPlacementMode, setIsManualSwitchPlacementMode] = useState(false); // НОВОЕ состояние
  const [isDrawingCableDuctMode, setIsDrawingCableDuctMode] = useState(false); // НОВОЕ состояние (бывший isDrawingCableMode)

  const [isEditingBeaconsMode, setIsEditingBeaconsMode] = useState(false);
  const [isEditingAntennasMode, setIsEditingAntennasMode] = useState(false);
  const [isEditingSwitchesMode, setIsEditingSwitchesMode] = useState(false); // НОВОЕ состояние (бывший isEditingServersMode)
  const [isEditingCableDuctsMode, setIsEditingCableDuctsMode] = useState(false); // НОВОЕ состояние (бывший isEditingCablesMode)

  const [isDeletingBeaconsMode, setIsDeletingBeaconsMode] = useState(false);
  const [isDeletingAntennasMode, setIsDeletingAntennasMode] = useState(false);
  const [isDeletingZonesMode, setIsDeletingZonesMode] = useState(false);
  const [isDeletingSwitchesMode, setIsDeletingSwitchesMode] = useState(false); // НОВОЕ состояние (бывший isDeletingServersMode)
  const [isDeletingCableDuctsMode, setIsDeletingCableDuctsMode] = useState(false); // НОВОЕ состояние (бывший isDeletingCablesMode)

  const [isRescalingMode, setIsRescalingMode] = useState(false);

  const [autoBeaconStep, setAutoBeaconStep] = useState(5);
  const [beaconPlacementType, setBeaconPlacementType] = useState<'chessboard' | 'row' | 'triangular' | 'adaptive'>('chessboard');

  const [autoAntennaHeight, setAutoAntennaHeight] = useState(2);
  const [autoAntennaAngle, setAutoAntennaAngle] = useState(0);
  const [autoZoneSize, setAutoZoneSize] = useState(5);

  const [showBeacons, setShowBeacons] = useState(true);
  const [showAntennas, setShowAntennas] = useState(true);
  const [showBarriers, setShowBarriers] = useState(true);
  const [showAntennaRanges, setShowAntennaRanges] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showSwitches, setShowSwitches] = useState(true); // НОВОЕ состояние
  const [showCableDucts, setShowCableDucts] = useState(true); // НОВОЕ состояние
  const [showCableDuctLengths, setShowCableDuctLengths] = useState(true); // НОВОЕ состояние для отображения длин кабелей

  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);

  const [isRescaleDialogOpen, setIsRescaleDialogOpen] = useState(false);
  const [currentDrawnLength, setCurrentDrawnLength] = useState(0);

  const calculatedAntennaRange = Math.max(
    10,
    5 + (autoAntennaHeight * 2) + (autoAntennaAngle / 360 * 5)
  );
  const calculatedAntennaStep = calculatedAntennaRange * 0.75;

  const beaconVectorSource = useRef(new VectorSource({ features: [] }));
  const beaconVectorLayer = useRef(new VectorLayer({ source: beaconVectorSource.current }));

  const antennaVectorSource = useRef(new VectorSource({ features: [] }));
  const antennaVectorLayer = useRef(new VectorLayer({ source: antennaVectorSource.current }));

  const barrierVectorSource = useRef(new VectorSource({ features: [] }));
  const barrierVectorLayer = useRef(new VectorLayer({ source: barrierVectorSource.current }));

  const zoneVectorSource = useRef(new VectorSource({ features: [] }));
  const zoneVectorLayer = useRef(new VectorLayer({ source: zoneVectorSource.current }));

  const switchVectorSource = useRef(new VectorSource({ features: [] })); // НОВЫЙ источник для коммутаторов
  const switchVectorLayer = useRef(new VectorLayer({ source: switchVectorSource.current })); // НОВЫЙ слой для коммутаторов

  const cableDuctVectorSource = useRef(new VectorSource({ features: [] })); // НОВЫЙ источник для кабель-каналов (бывший cableVectorSource)
  const cableDuctVectorLayer = useRef(new VectorLayer({ source: cableDuctVectorSource.current })); // НОВЫЙ слой для кабель-каналов (бывший cableVectorLayer)

  const rescaleDrawSource = useRef(new VectorSource({ features: [] }));
  const rescaleDrawLayer = useRef(new VectorLayer({ source: rescaleDrawSource.current }));

  const cableDuctLineStyle = useMemo(() => new Style({ // Базовый стиль для линии кабель-канала
    stroke: new Stroke({
      color: 'orange',
      width: 3,
      lineDash: [5, 5],
    }),
  }), []);

  const getAntennaStyle = useCallback((feature: Feature) => {
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
  }, [showAntennaRanges]);

  const getCableDuctStyle = useCallback((feature: Feature) => {
    const styles: Style[] = [cableDuctLineStyle]; // Базовый стиль для линии

    if (showCableDuctLengths) {
      const geometry = feature.getGeometry();
      if (geometry instanceof LineString) {
        const coordinates = geometry.getCoordinates();
        for (let i = 0; i < coordinates.length - 1; i++) {
          const p1 = coordinates[i];
          const p2 = coordinates[i + 1];

          // Calculate segment length
          const segmentLength = Math.sqrt(
            Math.pow(p2[0] - p1[0], 2) +
            Math.pow(p2[1] - p1[1], 2)
          );

          // Calculate midpoint for text placement
          const midpoint: Coordinate = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];

          styles.push(new Style({
            geometry: new Point(midpoint), // Текст размещается на точечной геометрии
            text: new Text({
              text: `${segmentLength.toFixed(2)} м`,
              font: '12px Calibri,sans-serif',
              fill: new Fill({ color: 'black' }),
              stroke: new Stroke({ color: 'white', width: 3 }),
              offsetY: -10, // Смещаем текст немного выше линии
              placement: 'point', // Убеждаемся, что текст размещается в точке
            }),
          }));
        }
      }
    }

    // Добавляем стиль при наведении, если применимо
    if (feature.get('id') === hoveredFeatureId) {
      styles.push(hoverStyle);
    }

    return styles;
  }, [showCableDuctLengths, cableDuctLineStyle, hoveredFeatureId]);


  // Effect for initializing the map
  useEffect(() => {
    if (!mapRef.current) return;

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

    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        imageLayer,
        beaconVectorLayer.current,
        antennaVectorLayer.current,
        barrierVectorLayer.current,
        zoneVectorLayer.current,
        switchVectorLayer.current,
        cableDuctVectorLayer.current,
        rescaleDrawLayer.current,
      ],
      view: new View({
        projection: imageProjection,
        center: getCenter(imageExtent),
        zoom: 0,
      }),
    });

    setMapInstance(initialMap);

    return () => {
      initialMap.setTarget(undefined);
    };
  }, [mapImageSrc, mapWidthMeters, mapHeightMeters]);

  // Effects to update layer styles based on state changes
  useEffect(() => {
    if (mapInstance) {
      beaconVectorLayer.current.setStyle((feature) => {
        const styles = [beaconStyle];
        if (feature.get('id') === hoveredFeatureId) {
          styles.push(hoverStyle);
        }
        return styles;
      });
      beaconVectorLayer.current.changed(); // Force redraw
    }
  }, [mapInstance, hoveredFeatureId]);

  useEffect(() => {
    if (mapInstance) {
      antennaVectorLayer.current.setStyle((feature) => {
        const styles = getAntennaStyle(feature);
        if (feature.get('id') === hoveredFeatureId) {
          styles.push(hoverStyle);
        }
        return styles;
      });
      antennaVectorLayer.current.changed(); // Force redraw
    }
  }, [mapInstance, getAntennaStyle, hoveredFeatureId]);

  useEffect(() => {
    if (mapInstance) {
      barrierVectorLayer.current.setStyle(barrierStyle);
      barrierVectorLayer.current.changed(); // Force redraw
    }
  }, [mapInstance]); // barrierStyle is static, so no dependencies needed here

  useEffect(() => {
    if (mapInstance) {
      zoneVectorLayer.current.setStyle((feature) => {
        const styles: Style[] = [zoneStyle];
        const beaconCount = feature.get('beaconCount');
        if (typeof beaconCount === 'number') {
          styles.push(new Style({
            geometry: feature.getGeometry()?.getInteriorPoint(),
            text: new Text({
              text: beaconCount.toString(),
              fill: new Fill({ color: 'black' }),
              stroke: new Stroke({ color: 'white', width: 2 }),
              font: 'bold 14px sans-serif',
            }),
          }));
        }
        if (feature.get('id') === hoveredFeatureId && isDeletingZonesMode) {
          styles.push(zoneHoverStyle);
        }
        return styles;
      });
      zoneVectorLayer.current.changed(); // Force redraw
    }
  }, [mapInstance, hoveredFeatureId, isDeletingZonesMode]);

  useEffect(() => {
    if (mapInstance) {
      switchVectorLayer.current.setStyle((feature) => {
        const styles = [switchStyle];
        if (feature.get('id') === hoveredFeatureId) {
          styles.push(hoverStyle);
        }
        return styles;
      });
      switchVectorLayer.current.changed(); // Force redraw
    }
  }, [mapInstance, hoveredFeatureId]);

  useEffect(() => {
    if (mapInstance) {
      cableDuctVectorLayer.current.setStyle((feature) => getCableDuctStyle(feature));
      cableDuctVectorLayer.current.changed(); // Force redraw
    }
  }, [mapInstance, getCableDuctStyle]);

  // Effect to update layer visibility
  useEffect(() => {
    if (mapInstance) {
      beaconVectorLayer.current.setVisible(showBeacons);
      antennaVectorLayer.current.setVisible(showAntennas);
      barrierVectorLayer.current.setVisible(showBarriers);
      zoneVectorLayer.current.setVisible(showZones);
      switchVectorLayer.current.setVisible(showSwitches); // Обновляем видимость
      cableDuctVectorLayer.current.setVisible(showCableDucts); // Обновляем видимость
    }
  }, [mapInstance, showBeacons, showAntennas, showBarriers, showZones, showSwitches, showCableDucts]);

  // Effect to update beacon features
  useEffect(() => {
    beaconVectorSource.current.clear();
    beacons.forEach(beacon => {
      const feature = new Feature({
        geometry: new Point(beacon.position),
        id: beacon.id,
      });
      beaconVectorSource.current.addFeature(feature);
    });
    onBeaconsChange(beacons);
  }, [beacons, onBeaconsChange]);

  // Effect to update antenna features
  useEffect(() => {
    antennaVectorSource.current.clear();
    antennas.forEach(antenna => {
      const feature = new Feature({
        geometry: new Point(antenna.position),
        id: antenna.id,
        height: antenna.height,
        angle: antenna.angle,
        range: antenna.range,
      });
      antennaVectorSource.current.addFeature(feature);
    });
    onAntennasChange(antennas);
  }, [antennas, onAntennasChange]);

  // Effect to update barrier features
  useEffect(() => {
    barrierVectorSource.current.clear();
    barriers.forEach(coords => {
      const polygon = new Polygon(coords);
      const feature = new Feature({ geometry: polygon });
      barrierVectorSource.current.addFeature(feature);
    });
    onBarriersChange(barriers);
  }, [barriers, onBarriersChange]);

  // Effect to update zone features and display beacon count
  useEffect(() => {
    zoneVectorSource.current.clear();
    zones.forEach(zone => {
      const polygon = new Polygon(zone.polygon);
      const feature = new Feature({ geometry: polygon, id: zone.id, beaconCount: zone.beaconCount });
      zoneVectorSource.current.addFeature(feature);
    });
    onZonesChange(zones);
  }, [zones, onZonesChange]);

  // Effect to update switch features
  useEffect(() => {
    switchVectorSource.current.clear();
    switches.forEach(s => {
      const feature = new Feature({
        geometry: new Point(s.position),
        id: s.id,
      });
      switchVectorSource.current.addFeature(feature);
    });
    onSwitchesChange(switches);
  }, [switches, onSwitchesChange]);

  // Effect to update cable duct features
  useEffect(() => {
    cableDuctVectorSource.current.clear();
    cableDucts.forEach(cableDuct => {
      const feature = new Feature({
        geometry: new LineString(cableDuct.path),
        id: cableDuct.id,
        type: cableDuct.type, // Сохраняем тип
      });
      cableDuctVectorSource.current.addFeature(feature);
    });
    onCableDuctsChange(cableDucts);
  }, [cableDucts, onCableDuctsChange]);

  // Consolidated useEffect for managing all map interactions
  useEffect(() => {
    if (!mapInstance) return;

    let currentInteraction: Interaction | null = null;
    let currentClickListener: ((event: any) => void) | null = null;
    let currentSnapInteraction: Snap | null = null;

    rescaleDrawSource.current.clear();

    // Remove existing interactions before adding new ones
    mapInstance.getInteractions().forEach(interaction => {
      if (interaction instanceof Draw || interaction instanceof Modify || interaction instanceof Snap) {
        mapInstance.removeInteraction(interaction);
      }
    });
    mapInstance.un('click', currentClickListener || (() => {})); // Remove previous click listener

    if (isDrawingBarrierMode) {
      currentInteraction = new Draw({
        source: barrierVectorSource.current,
        type: 'Polygon',
        style: sketchStyle,
      });
      (currentInteraction as Draw).on('drawend', (event: any) => {
        setBarriers(prev => [...prev, event.feature.getGeometry()?.getCoordinates() as Coordinate[][][]]);
        showSuccess('Барьер добавлен!');
      });
      currentSnapInteraction = new Snap({ source: barrierVectorSource.current });
    } else if (isDrawingZoneMode) {
      currentInteraction = new Draw({
        source: zoneVectorSource.current,
        type: 'Polygon',
        style: sketchStyle,
      });
      (currentInteraction as Draw).on('drawend', (event: any) => {
        setZones(prev => [...prev, {
          id: `zone-${Date.now()}`,
          polygon: event.feature.getGeometry()?.getCoordinates() as Coordinate[][][],
          beaconCount: 0,
        }]);
        showSuccess('Зона добавлена вручную!');
      });
      currentSnapInteraction = new Snap({ source: zoneVectorSource.current });
    } else if (isDrawingCableDuctMode) { // Режим рисования кабель-канала
      currentInteraction = new Draw({
        source: cableDuctVectorSource.current,
        type: 'LineString',
        style: sketchStyle,
      });
      (currentInteraction as Draw).on('drawend', (event: any) => {
        setCableDucts(prev => [...prev, {
          id: `cableDuct-${Date.now()}`,
          path: event.feature.getGeometry()?.getCoordinates() as Coordinate[],
          type: 'main', // НОВОЕ: Устанавливаем тип 'main'
        }]);
        showSuccess('Кабель-канал добавлен!');
      });
      currentSnapInteraction = new Snap({ source: cableDuctVectorSource.current });
    }
    else if (isEditingBeaconsMode) {
      currentInteraction = new Modify({
        source: beaconVectorSource.current,
        style: sketchStyle,
      });
      (currentInteraction as Modify).on('modifyend', (event: any) => {
        event.features.forEach((feature: Feature) => {
          const id = feature.get('id');
          const geometry = feature.getGeometry();
          if (id && geometry instanceof Point) {
            setBeacons(prevBeacons =>
              prevBeacons.map(b =>
                b.id === id ? { ...b, position: geometry.getCoordinates() as Coordinate } : b
              )
            );
          }
        });
        showSuccess('Позиция маяка обновлена!');
      });
      currentSnapInteraction = new Snap({ source: beaconVectorSource.current });
    } else if (isEditingAntennasMode) {
      currentInteraction = new Modify({
        source: antennaVectorSource.current,
        style: sketchStyle,
      });
      (currentInteraction as Modify).on('modifyend', (event: any) => {
        event.features.forEach((feature: Feature) => {
          const id = feature.get('id');
          const geometry = feature.getGeometry();
          if (id && geometry instanceof Point) {
            setAntennas(prevAntennas =>
              prevAntennas.map(a =>
                a.id === id ? { ...a, position: geometry.getCoordinates() as Coordinate } : a
              )
            );
          }
        });
        showSuccess('Позиция антенны обновлена!');
      });
      currentSnapInteraction = new Snap({ source: antennaVectorSource.current });
    } else if (isEditingSwitchesMode) { // Режим редактирования коммутаторов
      currentInteraction = new Modify({
        source: switchVectorSource.current,
        style: sketchStyle,
      });
      (currentInteraction as Modify).on('modifyend', (event: any) => {
        event.features.forEach((feature: Feature) => {
          const id = feature.get('id');
          const geometry = feature.getGeometry();
          if (id && geometry instanceof Point) {
            setSwitches(prevSwitches =>
              prevSwitches.map(s =>
                s.id === id ? { ...s, position: geometry.getCoordinates() as Coordinate } : s
              )
            );
          }
        });
        showSuccess('Позиция коммутатора обновлена!');
      });
      currentSnapInteraction = new Snap({ source: switchVectorSource.current });
    } else if (isEditingCableDuctsMode) { // Режим редактирования кабель-каналов
      currentInteraction = new Modify({
        source: cableDuctVectorSource.current,
        style: sketchStyle,
      });
      (currentInteraction as Modify).on('modifyend', (event: any) => {
        event.features.forEach((feature: Feature) => {
          const id = feature.get('id');
          const geometry = feature.getGeometry();
          if (id && geometry instanceof LineString) {
            setCableDucts(prevCableDucts =>
              prevCableDucts.map(c =>
                c.id === id ? { ...c, path: geometry.getCoordinates() as Coordinate[] } : c
              )
            );
          }
        });
        showSuccess('Кабель-канал обновлен!');
      });
      currentSnapInteraction = new Snap({ source: cableDuctVectorSource.current });
    } else if (isRescalingMode) {
      currentInteraction = new Draw({
        source: rescaleDrawSource.current,
        type: 'LineString',
        style: rescaleLineStyle,
        maxPoints: 2,
      });
      (currentInteraction as Draw).on('drawend', (event: any) => {
        const geometry = event.feature.getGeometry();
        if (geometry instanceof LineString) {
          const coords = geometry.getCoordinates();
          if (coords.length === 2) {
            const [startCoord, endCoord] = coords;
            const drawnLengthMeters = Math.sqrt(
              Math.pow(endCoord[0] - startCoord[0], 2) +
              Math.pow(endCoord[1] - startCoord[1], 2)
            );
            setCurrentDrawnLength(drawnLengthMeters);
            setIsRescaleDialogOpen(true);
          }
        }
      });
    } else if (isManualBeaconPlacementMode || isManualAntennaPlacementMode || isManualSwitchPlacementMode || isDeletingBeaconsMode || isDeletingAntennasMode || isDeletingZonesMode || isDeletingSwitchesMode || isDeletingCableDuctsMode) {
      currentClickListener = (event: any) => {
        const coordinate = event.coordinate;

        if (isManualBeaconPlacementMode) {
          const newBeacon: Beacon = {
            id: `beacon-${Date.now()}`,
            position: coordinate,
            price: beaconPrice,
          };
          setBeacons((prev) => [...prev, newBeacon]);
          showSuccess('Маяк добавлен вручную!');
        } else if (isManualAntennaPlacementMode) {
          const newAntenna: Antenna = {
            id: `antenna-${Date.now()}`,
            position: coordinate,
            height: autoAntennaHeight,
            angle: autoAntennaAngle,
            range: calculatedAntennaRange,
            price: antennaPrice,
          };
          setAntennas((prev) => [...prev, newAntenna]);
          showSuccess('Антенна добавлена вручную!');
        } else if (isManualSwitchPlacementMode) { // Ручная расстановка коммутатора
          const newSwitch: Switch = {
            id: `switch-${Date.now()}`,
            position: coordinate,
          };
          setSwitches((prev) => [...prev, newSwitch]);
          showSuccess('Коммутатор добавлен вручную!');
        } else if (isDeletingBeaconsMode) {
          mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
            const featureId = feature.get('id');
            if (featureId && feature.getGeometry()?.getType() === 'Point') {
              setBeacons(prev => prev.filter(b => b.id !== featureId));
              showSuccess('Маяк удален!');
              return true;
            }
            return false;
          }, {
            layerFilter: (layer) => layer === beaconVectorLayer.current,
            hitTolerance: 5,
          });
        } else if (isDeletingAntennasMode) {
          mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
            const featureId = feature.get('id');
            if (featureId && feature.getGeometry()?.getType() === 'Point') {
              setAntennas(prev => prev.filter(a => a.id !== featureId));
              showSuccess('Антенна удалена!');
              return true;
            }
            return false;
          }, {
            layerFilter: (layer) => layer === antennaVectorLayer.current,
            hitTolerance: 5,
          });
        } else if (isDeletingZonesMode) {
          mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
            const featureId = feature.get('id');
            if (featureId && feature.getGeometry()?.getType() === 'Polygon') {
              setZones(prev => prev.filter(z => z.id !== featureId));
              showSuccess('Зона удалена!');
              return true;
            }
            return false;
          }, {
            layerFilter: (layer) => layer === zoneVectorLayer.current,
            hitTolerance: 5,
          });
        } else if (isDeletingSwitchesMode) { // Удаление коммутатора
          mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
            const featureId = feature.get('id');
            if (featureId && feature.getGeometry()?.getType() === 'Point') {
              setSwitches(prev => prev.filter(s => s.id !== featureId));
              showSuccess('Коммутатор удален!');
              return true;
            }
            return false;
          }, {
            layerFilter: (layer) => layer === switchVectorLayer.current,
            hitTolerance: 5,
          });
        } else if (isDeletingCableDuctsMode) { // Удаление кабель-канала
          mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
            const featureId = feature.get('id');
            if (featureId && feature.getGeometry()?.getType() === 'LineString') {
              setCableDucts(prev => prev.filter(c => c.id !== featureId));
              showSuccess('Кабель-канал удален!');
              return true;
            }
            return false;
          }, {
            layerFilter: (layer) => layer === cableDuctVectorLayer.current,
            hitTolerance: 5,
          });
        }
      };
    }

    if (currentInteraction) {
      mapInstance.addInteraction(currentInteraction);
    }
    if (currentSnapInteraction) {
      mapInstance.addInteraction(currentSnapInteraction);
    }
    if (currentClickListener) {
      mapInstance.on('click', currentClickListener);
    }

    return () => {
      if (mapInstance) {
        if (currentInteraction) {
          mapInstance.removeInteraction(currentInteraction);
        }
        if (currentSnapInteraction) {
          mapInstance.removeInteraction(currentSnapInteraction);
        }
        if (currentClickListener) {
          mapInstance.un('click', currentClickListener);
        }
      }
      rescaleDrawSource.current.clear();
    };

  }, [
    mapInstance,
    isDrawingBarrierMode,
    isDrawingZoneMode,
    isDrawingCableDuctMode,
    isEditingBeaconsMode,
    isEditingAntennasMode,
    isEditingSwitchesMode,
    isEditingCableDuctsMode,
    isManualBeaconPlacementMode,
    isManualAntennaPlacementMode,
    isManualSwitchPlacementMode,
    isDeletingBeaconsMode,
    isDeletingAntennasMode,
    isDeletingZonesMode,
    isDeletingSwitchesMode,
    isDeletingCableDuctsMode,
    isRescalingMode,
    sketchStyle,
    rescaleLineStyle,
    setBeacons,
    setAntennas,
    setBarriers,
    setZones,
    setSwitches,
    setCableDucts,
    autoAntennaHeight,
    autoAntennaAngle,
    calculatedAntennaRange,
    beacons,
    antennas,
    switches,
    cableDucts,
    mapWidthMeters,
    mapHeightMeters,
    onMapDimensionsChange,
    setCurrentDrawnLength,
    setIsRescaleDialogOpen,
    beaconPrice,
    antennaPrice,
  ]);

  // Effect for pointermove to detect hovered features
  useEffect(() => {
    if (!mapInstance) return;

    const handlePointerMove = (event: any) => {
      let foundFeatureId: string | null = null;
      if (isDeletingBeaconsMode || isDeletingAntennasMode || isDeletingZonesMode || isDeletingSwitchesMode || isDeletingCableDuctsMode) {
        mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
          const featureId = feature.get('id');
          if (featureId) {
            const isBeacon = beacons.some(b => b.id === featureId);
            const isAntenna = antennas.some(a => a.id === featureId);
            const isZone = zones.some(z => z.id === featureId);
            const isSwitch = switches.some(s => s.id === featureId);
            const isCableDuct = cableDucts.some(c => c.id === featureId);

            if ((isDeletingBeaconsMode && isBeacon && feature.getGeometry()?.getType() === 'Point') ||
                (isDeletingAntennasMode && isAntenna && feature.getGeometry()?.getType() === 'Point') ||
                (isDeletingZonesMode && isZone && feature.getGeometry()?.getType() === 'Polygon') ||
                (isDeletingSwitchesMode && isSwitch && feature.getGeometry()?.getType() === 'Point') ||
                (isDeletingCableDuctsMode && isCableDuct && feature.getGeometry()?.getType() === 'LineString')) {
              foundFeatureId = featureId;
              return true;
            }
          }
          return false;
        }, {
          layerFilter: (layer) => layer === beaconVectorLayer.current || layer === antennaVectorLayer.current || layer === zoneVectorLayer.current || layer === switchVectorLayer.current || layer === cableDuctVectorLayer.current,
          hitTolerance: 10,
        });
        setHoveredFeatureId(foundFeatureId);
      } else {
        setHoveredFeatureId(null);
      }
    };

    mapInstance.on('pointermove', handlePointerMove);

    return () => {
      mapInstance.un('pointermove', handlePointerMove);
      setHoveredFeatureId(null);
    };
  }, [mapInstance, isDeletingBeaconsMode, isDeletingAntennasMode, isDeletingZonesMode, isDeletingSwitchesMode, isDeletingCableDuctsMode, beacons, antennas, zones, switches, cableDucts]);

  // Effects to update internal state from initial props (when loaded from parent)
  useEffect(() => {
    setBeacons(initialBeacons);
  }, [initialBeacons]);

  useEffect(() => {
    setAntennas(initialAntennas);
  }, [initialAntennas]);

  useEffect(() => {
    setBarriers(initialBarriers);
  }, [initialBarriers]);

  useEffect(() => {
    setZones(initialZones);
  }, [initialZones]);

  useEffect(() => {
    setSwitches(initialSwitches);
  }, [initialSwitches]);

  useEffect(() => {
    setCableDucts(initialCableDucts);
  }, [initialCableDucts]);

  // Logic to count beacons in zones
  useEffect(() => {
    const updatedZones = zones.map(zone => {
      const zonePolygon = new Polygon(zone.polygon);
      let count = 0;
      beacons.forEach(beacon => {
        const beaconPoint = new Point(beacon.position);
        if (zonePolygon.intersectsCoordinate(beaconPoint.getCoordinates())) {
          count++;
        }
      });
      return { ...zone, beaconCount: count };
    });
    if (JSON.stringify(updatedZones) !== JSON.stringify(zones)) {
      setZones(updatedZones);
    }
  }, [beacons, zones]);

  const handleAutoPlaceBeacons = () => {
    const newBeacons: Beacon[] = [];
    let idCounter = 0;

    const barrierGeometries = barrierVectorSource.current.getFeatures().map(f => f.getGeometry());

    const placeBeacon = (x: number, y: number) => {
      const beaconPoint = new Point([x, y]);
      let isInsideBarrier = false;
      for (const barrierGeom of barrierGeometries) {
        if (barrierGeom instanceof Polygon && barrierGeom.intersectsCoordinate(beaconPoint.getCoordinates())) {
          isInsideBarrier = true;
          break;
        }
      }

      if (!isInsideBarrier) {
        newBeacons.push({
          id: `beacon-auto-${idCounter++}`,
          position: [x, y],
          rssi: -70,
          price: beaconPrice,
        });
      }
    };

    if (beaconPlacementType === 'chessboard') {
      for (let y = autoBeaconStep / 2; y < mapHeightMeters; y += autoBeaconStep) {
        for (let x = autoBeaconStep / 2; x < mapWidthMeters; x += autoBeaconStep) {
          const offsetX = (Math.floor(y / autoBeaconStep) % 2 === 0) ? 0 : autoBeaconStep / 2;
          placeBeacon(x + offsetX, y);
        }
      }
    } else if (beaconPlacementType === 'row') {
      for (let y = autoBeaconStep / 2; y < mapHeightMeters; y += autoBeaconStep) {
        for (let x = autoBeaconStep / 2; x < mapWidthMeters; x += autoBeaconStep) {
          placeBeacon(x, y);
        }
      }
    } else if (beaconPlacementType === 'triangular') {
      const s = autoBeaconStep;
      const h = s * Math.sqrt(3) / 2;

      for (let y = h / 2; y < mapHeightMeters; y += h) {
        const rowOffset = (Math.floor(y / h) % 2 === 0) ? 0 : s / 2;

        for (let x = s / 2 + rowOffset; x < mapWidthMeters; x += s) {
          placeBeacon(x, y);
        }
      }
    } else if (beaconPlacementType === 'adaptive') {
      const numCols = Math.floor(mapWidthMeters / autoBeaconStep);
      const numRows = Math.floor(mapHeightMeters / autoBeaconStep);

      const totalCoveredWidth = numCols * autoBeaconStep;
      const totalCoveredHeight = numRows * autoBeaconStep;

      const offsetX = (mapWidthMeters - totalCoveredWidth) / 2;
      const offsetY = (mapHeightMeters - totalCoveredHeight) / 2;

      for (let y = offsetY + autoBeaconStep / 2; y < mapHeightMeters - offsetY; y += autoBeaconStep) {
        for (let x = offsetX + autoBeaconStep / 2; x < mapWidthMeters - offsetX; x += autoBeaconStep) {
          placeBeacon(x, y);
        }
      }
    }


    setBeacons(newBeacons);
    // Reset all other modes
    setIsManualBeaconPlacementMode(false);
    setIsManualAntennaPlacementMode(false);
    setIsDrawingBarrierMode(false);
    setIsDrawingZoneMode(false);
    setIsManualSwitchPlacementMode(false);
    setIsDrawingCableDuctMode(false);
    setIsEditingBeaconsMode(false);
    setIsEditingAntennasMode(false);
    setIsEditingSwitchesMode(false);
    setIsEditingCableDuctsMode(false);
    setIsDeletingBeaconsMode(false);
    setIsDeletingAntennasMode(false);
    setIsDeletingZonesMode(false);
    setIsDeletingSwitchesMode(false);
    setIsDeletingCableDuctsMode(false);
    setIsRescalingMode(false);
    showSuccess(`Автоматически размещено ${newBeacons.length} маяков (с учетом барьеров).`);
  };

  const handleAutoPlaceAntennas = () => {
    const newAntennas: Antenna[] = [];
    let idCounter = 0;

    const barrierGeometries = barrierVectorSource.current.getFeatures().map(f => f.getGeometry());

    for (let y = calculatedAntennaStep / 2; y < mapHeightMeters; y += calculatedAntennaStep) {
      for (let x = calculatedAntennaStep / 2; x < mapWidthMeters; x += calculatedAntennaStep) {
        const antennaPoint = new Point([x, y]);
        let isInsideBarrier = false;
        for (const barrierGeom of barrierGeometries) {
          if (barrierGeom instanceof Polygon && barrierGeom.intersectsCoordinate(antennaPoint.getCoordinates())) {
            isInsideBarrier = true;
            break;
          }
        }

        if (!isInsideBarrier) {
          newAntennas.push({
            id: `antenna-auto-${idCounter++}`,
            position: [x, y],
            height: autoAntennaHeight,
            angle: autoAntennaAngle,
            range: calculatedAntennaRange,
            price: antennaPrice,
          });
        }
      }
    }
    setAntennas(newAntennas);
    // Reset all other modes
    setIsManualBeaconPlacementMode(false);
    setIsManualAntennaPlacementMode(false);
    setIsDrawingBarrierMode(false);
    setIsDrawingZoneMode(false);
    setIsManualSwitchPlacementMode(false);
    setIsDrawingCableDuctMode(false);
    setIsEditingBeaconsMode(false);
    setIsEditingAntennasMode(false);
    setIsEditingSwitchesMode(false);
    setIsEditingCableDuctsMode(false);
    setIsDeletingBeaconsMode(false);
    setIsDeletingAntennasMode(false);
    setIsDeletingZonesMode(false);
    setIsDeletingSwitchesMode(false);
    setIsDeletingCableDuctsMode(false);
    setIsRescalingMode(false);
    showSuccess(`Автоматически размещено ${newAntennas.length} антенн (с учетом барьеров).`);
  };

  const handleAutoPlaceZones = () => {
    const newZones: Zone[] = [];
    let idCounter = 0;
    const zoneSize = autoZoneSize;

    const barrierGeometries = barrierVectorSource.current.getFeatures().map(f => f.getGeometry());

    for (let y = 0; y < mapHeightMeters; y += zoneSize) {
      for (let x = 0; x < mapWidthMeters; x += zoneSize) {
        const zonePolygonCoords = [
          [[x, y], [x + zoneSize, y], [x + zoneSize, y + zoneSize], [x, y + zoneSize], [x, y]]
        ];
        const zonePolygon = new Polygon(zonePolygonCoords);

        let isOverlappingBarrier = false;
        const center = getCenter(zonePolygon.getExtent());
        for (const barrierGeom of barrierGeometries) {
          if (barrierGeom instanceof Polygon && barrierGeom.intersectsCoordinate(center)) {
            isOverlappingBarrier = true;
            break;
          }
        }

        if (!isOverlappingBarrier) {
          newZones.push({
            id: `zone-auto-${idCounter++}`,
            polygon: zonePolygonCoords,
            beaconCount: 0,
          });
        }
      }
    }
    setZones(newZones);
    showSuccess(`Автоматически размещено ${newZones.length} зон.`);
    // Reset all other modes
    setIsManualBeaconPlacementMode(false);
    setIsManualAntennaPlacementMode(false);
    setIsDrawingBarrierMode(false);
    setIsDrawingZoneMode(false);
    setIsManualSwitchPlacementMode(false);
    setIsDrawingCableDuctMode(false);
    setIsEditingBeaconsMode(false);
    setIsEditingAntennasMode(false);
    setIsEditingSwitchesMode(false);
    setIsEditingCableDuctsMode(false);
    setIsDeletingBeaconsMode(false);
    setIsDeletingAntennasMode(false);
    setIsDeletingZonesMode(false);
    setIsDeletingSwitchesMode(false);
    setIsDeletingCableDuctsMode(false);
    setIsRescalingMode(false);
  };

  const handleClearBeacons = () => {
    setBeacons([]);
    showSuccess('Все маяки удалены.');
  };

  const handleClearAntennas = () => {
    setAntennas([]);
    showSuccess('Все антенны удалены.');
  };

  const handleClearBarriers = () => {
    barrierVectorSource.current.clear();
    setBarriers([]);
    showSuccess('Все барьеры удалены.');
  };

  const handleClearZones = () => {
    zoneVectorSource.current.clear();
    setZones([]);
    showSuccess('Все зоны удалены.');
  };

  const handleClearSwitches = () => { // НОВАЯ функция для коммутаторов
    switchVectorSource.current.clear();
    setSwitches([]);
    showSuccess('Все коммутаторы удалены.');
  };

  const handleClearCableDucts = () => { // НОВАЯ функция для кабель-каналов
    cableDuctVectorSource.current.clear();
    setCableDucts([]);
    showSuccess('Все кабель-каналы удалены.');
  };

  const handleExportMapToPNG = () => {
    if (!mapInstance) {
      showError('Карта не инициализирована.');
      return;
    }

    const exportDiv = document.createElement('div');
    const exportResolution = 10;
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
      source: beaconVectorSource.current,
      style: beaconStyle,
    });
    exportBeaconLayer.setVisible(showBeacons);

    const exportAntennaLayer = new VectorLayer({
      source: antennaVectorSource.current,
      style: (feature) => getAntennaStyle(feature),
    });
    exportAntennaLayer.setVisible(showAntennas);

    const exportBarrierLayer = new VectorLayer({
      source: barrierVectorSource.current,
      style: barrierStyle,
    });
    exportBarrierLayer.setVisible(showBarriers);

    const exportSwitchLayer = new VectorLayer({ // НОВЫЙ слой для экспорта коммутаторов
      source: switchVectorSource.current,
      style: switchStyle,
    });
    exportSwitchLayer.setVisible(showSwitches);

    const exportCableDuctLayer = new VectorLayer({ // НОВЫЙ слой для экспорта кабель-каналов
      source: cableDuctVectorSource.current,
      style: (feature) => getCableDuctStyle(feature), // Используем новую функцию стиля для экспорта
    });
    exportCableDuctLayer.setVisible(showCableDucts);

    const exportMap = new Map({
      target: exportDiv,
      layers: [imageLayer, exportBeaconLayer, exportAntennaLayer, exportBarrierLayer, exportSwitchLayer, exportCableDuctLayer],
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

  const handleRescaleConfirm = (realWorldLength: number) => {
    if (currentDrawnLength > 0) {
      const scaleFactor = realWorldLength / currentDrawnLength;
      const newMapWidth = mapWidthMeters * scaleFactor;
      const newMapHeight = mapHeightMeters * scaleFactor;

      onMapDimensionsChange(newMapWidth, newMapHeight);
      showSuccess(`Карта ремасштабирована! Новые размеры: ${newMapWidth.toFixed(2)}м x ${newMapHeight.toFixed(2)}м`);
    } else {
      showError('Некорректная длина нарисованного отрезка.');
    }
    rescaleDrawSource.current.clear();
    setIsRescalingMode(false);
    setIsRescaleDialogOpen(false);
  };

  const handleRescaleCancel = () => {
    rescaleDrawSource.current.clear();
    setIsRescalingMode(false);
    setIsRescaleDialogOpen(false);
  };

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

  // Helper to find the closest point on any main cable duct to a given coordinate
  const findClosestPointOnAnyMainCableDuct = (targetCoordinate: Coordinate): Coordinate | null => {
    let minDistance = Infinity;
    let closestPoint: Coordinate | null = null;

    // Ищем только среди основных кабель-каналов
    const mainCableDucts = cableDucts.filter(duct => duct.type === 'main');

    mainCableDucts.forEach(mainDuct => {
      const geometry = new LineString(mainDuct.path);
      const pointOnCableDuct = geometry.getClosestPoint(targetCoordinate);
      const distance = Math.sqrt(
        Math.pow(pointOnCableDuct[0] - targetCoordinate[0], 2) +
        Math.pow(pointOnCableDuct[1] - targetCoordinate[1], 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = pointOnCableDuct;
      }
    });
    return closestPoint;
  };

  const handleAttachToNearestCableDuct = () => {
    if (antennas.length === 0) {
      showError('Нет антенн для привязки.');
      return;
    }
    const mainCableDuctsExist = cableDucts.some(duct => duct.type === 'main');
    if (!mainCableDuctsExist) {
      showError('Нет существующих основных кабель-каналов для привязки. Сначала нарисуйте кабель-канал.');
      return;
    }

    // Filter out existing connection ducts before adding new ones
    const currentMainDucts = cableDucts.filter(duct => duct.type === 'main');
    const newCableDuctsToAdd: CableDuct[] = [];

    antennas.forEach(antenna => {
      const closestPointOnMainDuct = findClosestPointOnAnyMainCableDuct(antenna.position);

      if (closestPointOnMainDuct) {
        newCableDuctsToAdd.push({
          id: `connection-duct-${Date.now()}-${antenna.id}`, // Unique ID for connection
          path: [antenna.position, closestPointOnMainDuct],
          type: 'connection', // НОВОЕ: Устанавливаем тип 'connection'
        });
      }
    });

    // Set cableDucts to only main ducts + newly generated connection ducts
    setCableDucts([...currentMainDucts, ...newCableDuctsToAdd]);

    if (newCableDuctsToAdd.length > 0) {
      showSuccess(`Проложено ${newCableDuctsToAdd.length} соединений к ближайшим кабель-каналам.`);
    } else {
      showError('Все антенны уже подключены к ближайшим кабель-каналам или нет новых подключений.');
    }
    // Reset all other modes after this one-shot action
    setIsManualBeaconPlacementMode(false);
    setIsManualAntennaPlacementMode(false);
    setIsDrawingBarrierMode(false);
    setIsDrawingZoneMode(false);
    setIsManualSwitchPlacementMode(false);
    setIsDrawingCableDuctMode(false);
    setIsEditingBeaconsMode(false);
    setIsEditingAntennasMode(false);
    setIsEditingSwitchesMode(false);
    setIsEditingCableDuctsMode(false);
    setIsDeletingBeaconsMode(false);
    setIsDeletingAntennasMode(false);
    setIsDeletingZonesMode(false);
    setIsDeletingSwitchesMode(false);
    setIsDeletingCableDuctsMode(false);
    setIsRescalingMode(false);
  };

  // Helper to check if a point is close to any switch
  const isPointNearSwitch = (point: Coordinate): boolean => {
    const tolerance = 5; // meters
    return switches.some(s => {
      const switchPos = s.position;
      const distance = Math.sqrt(
        Math.pow(point[0] - switchPos[0], 2) +
        Math.pow(point[1] - switchPos[1], 2)
      );
      return distance <= tolerance;
    });
  };

  // Calculate total cable duct length
  const totalCableDuctLength = useMemo(() => {
    let totalLength = 0;
    cableDucts.forEach(cableDuct => {
      totalLength += calculateCableDuctLength(cableDuct.path);
    });
    return totalLength;
  }, [cableDucts]);

  // Calculate conditional cable duct length based on the provided formula
  const conditionalCableDuctLength = useMemo(() => {
    let totalLength = 0;
    const mainDucts = cableDucts.filter(duct => duct.type === 'main');
    const connectionDucts = cableDucts.filter(duct => duct.type === 'connection');

    // Length for main cable ducts
    mainDucts.forEach(mainDuct => {
      const startConnected = isPointNearSwitch(mainDuct.path[0]);
      const endConnected = isPointNearSwitch(mainDuct.path[mainDuct.path.length - 1]);

      if (startConnected || endConnected) {
        const mainDuctLength = calculateCableDuctLength(mainDuct.path);
        let connectedAntennaCount = 0;
        const mainDuctGeometry = new LineString(mainDuct.path);
        const tolerance = 0.1; // Small tolerance for point on line check

        // Count antennas connected to this specific main duct
        connectionDucts.forEach(connDuct => {
          const [point1, point2] = connDuct.path;
          let connectionPointCoord: Coordinate | null = null;

          // Determine which point of the connection duct is on the main duct
          const isPoint1Antenna = antennas.some(a => a.position[0] === point1[0] && a.position[1] === point1[1]);
          const isPoint2Antenna = antennas.some(a => a.position[0] === point2[0] && a.position[1] === point2[1]);

          if (isPoint1Antenna && !isPoint2Antenna) {
            connectionPointCoord = point2;
          } else if (!isPoint1Antenna && isPoint2Antenna) {
            connectionPointCoord = point1;
          }

          if (connectionPointCoord) {
            const closestPointOnMainDuct = mainDuctGeometry.getClosestPoint(connectionPointCoord);
            const distanceToMainDuct = Math.sqrt(
              Math.pow(closestPointOnMainDuct[0] - connectionPointCoord[0], 2) +
              Math.pow(closestPointOnMainDuct[1] - connectionPointCoord[1], 2)
            );

            if (distanceToMainDuct < tolerance) {
              connectedAntennaCount++;
            }
          }
        });
        
        // Apply the length for the main duct based on connected antennas
        totalLength += mainDuctLength * connectedAntennaCount;
      }
    });

    // Length for connection cable ducts
    connectionDucts.forEach(connDuct => {
      const connDuctLength = calculateCableDuctLength(connDuct.path);
      totalLength += connDuctLength;
    });

    return totalLength;
  }, [cableDucts, switches, antennas]);


  // Calculate total cable duct cost based on new logic
  const totalCableDuctCost = useMemo(() => {
    return conditionalCableDuctLength * cablePricePerMeter;
  }, [conditionalCableDuctLength, cablePricePerMeter]);


  const totalMapArea = mapWidthMeters * mapHeightMeters;
  const totalBarrierArea = barrierVectorSource.current.getFeatures().reduce((sum, feature) => {
    const geometry = feature.getGeometry();
    if (geometry instanceof Polygon) {
      return sum + geometry.getArea();
    }
    return sum;
  }, 0);
  const movableArea = totalMapArea - totalBarrierArea;

  // Расчет общей стоимости оборудования
  const totalBeaconCost = beacons.reduce((sum, beacon) => sum + (beacon.price || 0), 0);
  const totalAntennaCost = antennas.reduce((sum, antenna) => sum + (antenna.price || 0), 0);
  const totalEquipmentCost = totalBeaconCost + totalAntennaCost + totalCableDuctCost; // Добавляем стоимость кабель-каналов

  return (
    <div className="flex flex-col gap-4">
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

        <div className="p-4 border rounded-md grid grid-cols-1 sm:grid-cols-2 gap-2">
          <h3 className="text-lg font-semibold col-span-full text-center mb-2">Работа с барьерами:</h3>
          <Button
            onClick={() => {
              setIsDrawingBarrierMode(!isDrawingBarrierMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsDrawingZoneMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isDrawingBarrierMode ? 'destructive' : 'default'}
          >
            {isDrawingBarrierMode ? 'Выйти из режима рисования' : 'Рисовать барьеры'}
          </Button>
          <Button onClick={handleClearBarriers} variant="outline">
            Очистить все барьеры
          </Button>
        </div>

        <div className="p-4 border rounded-md grid grid-cols-1 sm:grid-cols-2 gap-2">
          <h3 className="text-lg font-semibold col-span-full text-center mb-2">Работа с маяками:</h3>
          <Button
            onClick={() => {
              setIsManualBeaconPlacementMode(!isManualBeaconPlacementMode);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isManualBeaconPlacementMode ? 'destructive' : 'default'}
          >
            {isManualBeaconPlacementMode ? 'Выйти из ручной расстановки' : 'Ручная расстановка'}
          </Button>
          <Button
            onClick={() => {
              setIsEditingBeaconsMode(!isEditingBeaconsMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsEditingAntennasMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isEditingBeaconsMode ? 'destructive' : 'default'}
          >
            {isEditingBeaconsMode ? 'Выйти из редактирования' : 'Редактировать маяки'}
          </Button>
          <Button
            onClick={() => {
              setIsDeletingBeaconsMode(!isDeletingBeaconsMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isDeletingBeaconsMode ? 'destructive' : 'default'}
          >
            {isDeletingBeaconsMode ? 'Выйти из удаления' : 'Удалить маяк'}
          </Button>
          <Button onClick={handleClearBeacons} variant="outline">
            Очистить все маяки
          </Button>
          <div className="flex flex-col gap-2 col-span-full">
            <Label htmlFor="beaconPrice">Цена маяка (ед.)</Label>
            <Input
              id="beaconPrice"
              type="number"
              value={beaconPrice}
              onChange={(e) => onBeaconPriceChange(Number(e.target.value))}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="p-4 border rounded-md grid grid-cols-1 sm:grid-cols-2 gap-2">
          <h3 className="text-lg font-semibold col-span-full text-center mb-2">Работа с антеннами:</h3>
          <Button
            onClick={() => {
              setIsManualAntennaPlacementMode(!isManualAntennaPlacementMode);
              setIsManualBeaconPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isManualAntennaPlacementMode ? 'destructive' : 'default'}
          >
            {isManualAntennaPlacementMode ? 'Выйти из ручной расстановки' : 'Ручная расстановка'}
          </Button>
          <Button
            onClick={() => {
              setIsEditingAntennasMode(!isEditingAntennasMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsEditingBeaconsMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isEditingAntennasMode ? 'destructive' : 'default'}
          >
            {isEditingAntennasMode ? 'Выйти из редактирования' : 'Редактировать антенны'}
          </Button>
          <Button
            onClick={() => {
              setIsDeletingAntennasMode(!isDeletingAntennasMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingZonesMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isDeletingAntennasMode ? 'destructive' : 'default'}
          >
            {isDeletingAntennasMode ? 'Выйти из удаления' : 'Удалить антенну'}
          </Button>
          <Button onClick={handleClearAntennas} variant="outline">
            Очистить все антенны
          </Button>
          <div className="flex flex-col gap-2 col-span-full">
            <Label htmlFor="antennaPrice">Цена антенны (ед.)</Label>
            <Input
              id="antennaPrice"
              type="number"
              value={antennaPrice}
              onChange={(e) => onAntennaPriceChange(Number(e.target.value))}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="p-4 border rounded-md grid grid-cols-1 md:grid-cols-2 gap-4">
          <h3 className="text-lg font-semibold col-span-full text-center mb-2">Автоматическая расстановка маяков:</h3>
          <div className="flex flex-col gap-2">
            <Label htmlFor="beaconPlacementType">Способ расстановки</Label>
            <Select value={beaconPlacementType} onValueChange={(value: 'chessboard' | 'row' | 'triangular' | 'adaptive') => setBeaconPlacementType(value)}>
              <SelectTrigger id="beaconPlacementType">
                <SelectValue placeholder="Выберите способ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chessboard">Шахматный порядок</SelectItem>
                <SelectItem value="row">Строчный порядок</SelectItem>
                <SelectItem value="triangular">Треугольная сетка</SelectItem>
                <SelectItem value="adaptive">Адаптивный</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="autoBeaconStep">Шаг (метры: {autoBeaconStep} м)</Label>
            <Input
              id="autoBeaconStep"
              type="number"
              value={autoBeaconStep}
              onChange={(e) => setAutoBeaconStep(Number(e.target.value))}
              min="1"
              max="50"
              step="1"
            />
          </div>
          <Button onClick={handleAutoPlaceBeacons} className="col-span-full">
            Автоматически расставить маяки
          </Button>
        </div>

        <div className="p-4 border rounded-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <h3 className="text-lg font-semibold col-span-full text-center mb-2">Автоматическая расстановка антенн:</h3>
          <div className="flex flex-col gap-2">
            <Label htmlFor="autoAntennaHeight">Высота (метры: {autoAntennaHeight} м)</Label>
            <Input
              id="autoAntennaHeight"
              type="number"
              value={autoAntennaHeight}
              onChange={(e) => setAutoAntennaHeight(Number(e.target.value))}
              min="0"
              step="0.1"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="autoAntennaAngle">Угол (градусы: {autoAntennaAngle}°)</Label>
            <Input
              id="autoAntennaAngle"
              type="number"
              value={autoAntennaAngle}
              onChange={(e) => setAutoAntennaAngle(Number(e.target.value))}
              min="0"
              max="360"
              step="1"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Радиус покрытия (метры: {calculatedAntennaRange.toFixed(2)} м)</Label>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Шаг расстановки (метры: {calculatedAntennaStep.toFixed(2)} м)</Label>
          </div>
          <Button onClick={handleAutoPlaceAntennas} className="col-span-full">
            Автоматически расставить антенны
          </Button>
        </div>

        <div className="p-4 border rounded-md grid grid-cols-1 sm:grid-cols-2 gap-4">
          <h3 className="text-lg font-semibold col-span-full text-center mb-2">Инструменты карты и слои:</h3>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showBeacons"
              checked={showBeacons}
              onCheckedChange={(checked) => setShowBeacons(Boolean(checked))}
            />
            <Label htmlFor="showBeacons">Показать маяки</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showAntennas"
              checked={showAntennas}
              onCheckedChange={(checked) => setShowAntennas(Boolean(checked))}
            />
            <Label htmlFor="showAntennas">Показать антенны</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showBarriers"
              checked={showBarriers}
              onCheckedChange={(checked) => setShowBarriers(Boolean(checked))}
            />
            <Label htmlFor="showBarriers">Показать барьеры</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showAntennaRanges"
              checked={showAntennaRanges}
              onCheckedChange={(checked) => setShowAntennaRanges(Boolean(checked))}
            />
            <Label htmlFor="showAntennaRanges">Показать радиус антенн</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showZones"
              checked={showZones}
              onCheckedChange={(checked) => setShowZones(Boolean(checked))}
            />
            <Label htmlFor="showZones">Показать зоны</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showSwitches"
              checked={showSwitches}
              onCheckedChange={(checked) => setShowSwitches(Boolean(checked))}
            />
            <Label htmlFor="showSwitches">Показать коммутаторы</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showCableDucts"
              checked={showCableDucts}
              onCheckedChange={(checked) => setShowCableDucts(Boolean(checked))}
            />
            <Label htmlFor="showCableDucts">Показать кабель-каналы</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showCableDuctLengths"
              checked={showCableDuctLengths}
              onCheckedChange={(checked) => setShowCableDuctLengths(Boolean(checked))}
            />
            <Label htmlFor="showCableDuctLengths">Показать длину кабеля</Label>
          </div>
          <Button
            onClick={() => {
              setIsRescalingMode(!isRescalingMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
            }}
            variant={isRescalingMode ? 'destructive' : 'default'}
            className="col-span-full"
          >
            {isRescalingMode ? 'Выйти из режима ремасштабирования' : 'Ремасштабировать карту'}
          </Button>
        </div>

        {/* Новый блок для зонального трекинга */}
        <div className="p-4 border rounded-md grid grid-cols-1 sm:grid-cols-2 gap-2">
          <h3 className="text-lg font-semibold col-span-full text-center mb-2">Работа с зональным трекингом:</h3>
          <div className="flex flex-col gap-2 col-span-full">
            <Label htmlFor="autoZoneSize">Размер зоны (метры: {autoZoneSize} м)</Label>
            <Input
              id="autoZoneSize"
              type="number"
              value={autoZoneSize}
              onChange={(e) => setAutoZoneSize(Number(e.target.value))}
              min="1"
              max="50"
              step="1"
            />
          </div>
          <Button onClick={handleAutoPlaceZones} variant="default">
            Автоматически расставить зоны
          </Button>
          <Button
            onClick={() => {
              setIsDrawingZoneMode(!isDrawingZoneMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isDrawingZoneMode ? 'destructive' : 'default'}
          >
            {isDrawingZoneMode ? 'Выйти из режима рисования' : 'Рисовать зоны'}
          </Button>
          <Button
            onClick={() => {
              setIsDeletingZonesMode(!isDeletingZonesMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isDeletingZonesMode ? 'destructive' : 'default'}
          >
            {isDeletingZonesMode ? 'Выйти из удаления' : 'Удалить зону'}
          </Button>
          <Button onClick={handleClearZones} variant="outline">
            Очистить все зоны
          </Button>
        </div>

        {/* Новый блок для серверного оборудования */}
        <div className="p-4 border rounded-md grid grid-cols-1 sm:grid-cols-2 gap-2">
          <h3 className="text-lg font-semibold col-span-full text-center mb-2">Коммутаторы и кабель-каналы:</h3>
          <Button
            onClick={() => {
              setIsManualSwitchPlacementMode(!isManualSwitchPlacementMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isManualSwitchPlacementMode ? 'destructive' : 'default'}
          >
            {isManualSwitchPlacementMode ? 'Выйти из режима' : 'Указать коммутатор'}
          </Button>
          <Button
            onClick={() => {
              setIsDrawingCableDuctMode(!isDrawingCableDuctMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isDrawingCableDuctMode ? 'destructive' : 'default'}
          >
            {isDrawingCableDuctMode ? 'Выйти из режима' : 'Кабель-канал'}
          </Button>
          <Button
            onClick={() => {
              setIsEditingSwitchesMode(!isEditingSwitchesMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isEditingSwitchesMode ? 'destructive' : 'default'}
          >
            {isEditingSwitchesMode ? 'Выйти из редактирования' : 'Редактировать коммутатор'}
          </Button>
          <Button
            onClick={() => {
              setIsEditingCableDuctsMode(!isEditingCableDuctsMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsEditingSwitchesMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsDeletingSwitchesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isEditingCableDuctsMode ? 'destructive' : 'default'}
          >
            {isEditingCableDuctsMode ? 'Выйти из редактирования' : 'Редактировать кабель-канал'}
          </Button>
          <Button
            onClick={() => {
              setIsDeletingSwitchesMode(!isDeletingSwitchesMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsDeletingCableDuctsMode(false);
              setIsRescalingMode(false);
            }}
            variant={isDeletingSwitchesMode ? 'destructive' : 'default'}
          >
            {isDeletingSwitchesMode ? 'Выйти из удаления' : 'Удалить коммутатор'}
          </Button>
          <Button
            onClick={() => {
              setIsDeletingCableDuctsMode(!isDeletingCableDuctsMode);
              setIsManualBeaconPlacementMode(false);
              setIsManualAntennaPlacementMode(false);
              setIsDrawingBarrierMode(false);
              setIsDrawingZoneMode(false);
              setIsManualSwitchPlacementMode(false);
              setIsDrawingCableDuctMode(false);
              setIsEditingBeaconsMode(false);
              setIsEditingAntennasMode(false);
              setIsEditingSwitchesMode(false);
              setIsEditingCableDuctsMode(false);
              setIsDeletingBeaconsMode(false);
              setIsDeletingAntennasMode(false);
              setIsDeletingZonesMode(false);
              setIsDeletingSwitchesMode(false);
              setIsRescalingMode(false);
            }}
            variant={isDeletingCableDuctsMode ? 'destructive' : 'default'}
          >
            {isDeletingCableDuctsMode ? 'Выйти из удаления' : 'Удалить кабель-канал'}
          </Button>
          <Button
            onClick={handleAttachToNearestCableDuct} // Теперь это прямое действие, а не переключение режима
            variant="default"
          >
            Привязать антенны к кабель-каналам
          </Button>
          <Button onClick={handleClearSwitches} variant="outline">
            Очистить все коммутаторы
          </Button>
          <Button onClick={handleClearCableDucts} variant="outline">
            Очистить все кабель-каналы
          </Button>
          <div className="flex flex-col gap-2 col-span-full">
            <Label htmlFor="cablePricePerMeter">Цена кабель-канала за метр (ед.)</Label>
            <Input
              id="cablePricePerMeter"
              type="number"
              value={cablePricePerMeter}
              onChange={(e) => onCablePricePerMeterChange(Number(e.target.value))}
              min="0"
              step="0.01"
            />
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

      <div ref={mapRef} className="w-full h-[600px] border rounded-md" />

      {beacons.length > 0 && (
        <div className="mt-4 p-4 border rounded-md">
          <h3 className="text-lg font-semibold mb-2">Размещенные маяки:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {beacons.map((beacon) => (
              <div key={beacon.id} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-sm text-sm">
                ID: {beacon.id.substring(0, 8)}... <br />
                Позиция: ({beacon.position[0].toFixed(2)}м, {beacon.position[1].toFixed(2)}м)
                {beacon.rssi && <><br />RSSI: {beacon.rssi} dBm</>}
                {beacon.price !== undefined && <><br />Цена: {beacon.price.toFixed(2)} ед.</>}
              </div>
            ))}
          </div>
        </div>
      )}

      {antennas.length > 0 && (
        <div className="mt-4 p-4 border rounded-md">
          <h3 className="text-lg font-semibold mb-2">Размещенные антенны:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {antennas.map((antenna) => (
              <div key={antenna.id} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-sm text-sm">
                ID: {antenna.id.substring(0, 8)}... <br />
                Позиция: ({antenna.position[0].toFixed(2)}м, {antenna.position[1].toFixed(2)}м) <br />
                Высота: {antenna.height.toFixed(1)}м, Угол: {antenna.angle}° <br />
                Радиус: {antenna.range.toFixed(1)}м
                {antenna.price !== undefined && <><br />Цена: {antenna.price.toFixed(2)} ед.</>}
              </div>
            ))}
          </div>
        </div>
      )}

      {zones.length > 0 && (
        <div className="mt-4 p-4 border rounded-md">
          <h3 className="text-lg font-semibold mb-2">Размещенные зоны:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {zones.map((zone) => (
              <div key={zone.id} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-sm text-sm">
                ID: {zone.id.substring(0, 8)}... <br />
                Маяков: {zone.beaconCount}
              </div>
            ))}
          </div>
        </div>
      )}

      {switches.length > 0 && (
        <div className="mt-4 p-4 border rounded-md">
          <h3 className="text-lg font-semibold mb-2">Размещенные коммутаторы:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {switches.map((s) => (
              <div key={s.id} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-sm text-sm">
                ID: {s.id.substring(0, 8)}... <br />
                Позиция: ({s.position[0].toFixed(2)}м, {s.position[1].toFixed(2)}м)
              </div>
            ))}
          </div>
        </div>
      )}

      {cableDucts.length > 0 && (
        <div className="mt-4 p-4 border rounded-md">
          <h3 className="text-lg font-semibold mb-2">Проложенные кабель-каналы:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {cableDucts.map((cableDuct) => (
              <div key={cableDuct.id} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-sm text-sm">
                ID: {cableDuct.id.substring(0, 8)}... <br />
                Тип: {cableDuct.type === 'main' ? 'Основной' : 'Соединительный'} <br />
                Точек: {cableDuct.path.length}
              </div>
            ))}
          </div>
        </div>
      )}

      <RescaleDialog
        isOpen={isRescaleDialogOpen}
        onClose={handleRescaleCancel}
        onConfirm={handleRescaleConfirm}
        drawnLengthMeters={currentDrawnLength}
      />
    </div>
  );
};

export default MapDisplay;