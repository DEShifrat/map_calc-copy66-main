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
import { Draw, Modify, Snap, Interaction } from 'ol/interaction';
import { showSuccess, showError } from '@/utils/toast';

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

const barrierHoverStyle = new Style({
  stroke: new Stroke({
    color: 'orange',
    width: 3,
  }),
  fill: new Fill({
    color: 'rgba(255, 165, 0, 0.2)',
  }),
});
// --- Конец стилей, определенных за пределами компонента ---

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

// Типы активных взаимодействий
export type MapInteractionType =
  | 'drawBarrier'
  | 'drawZone'
  | 'drawCableDuct'
  | 'manualBeacon'
  | 'manualAntenna'
  | 'manualSwitch'
  | 'editBeacon'
  | 'editAntenna'
  | 'editSwitch'
  | 'editCableDuct'
  | 'deleteBeacon'
  | 'deleteAntenna'
  | 'deleteZone'
  | 'deleteBarrier' // Added deleteBarrier
  | 'deleteSwitch'
  | 'deleteCableDuct'
  | 'rescale'
  | null;

interface MapCoreProps {
  mapImageSrc: string;
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
  activeInteraction: MapInteractionType;
  onFeatureAdd: (type: 'beacon' | 'antenna' | 'barrier' | 'zone' | 'switch' | 'cableDuct', featureData: any) => void;
  onFeatureModify: (type: 'beacon' | 'antenna' | 'switch' | 'cableDuct', id: string, newPosition: Coordinate | Coordinate[]) => void;
  onFeatureDelete: (type: 'beacon' | 'antenna' | 'zone' | 'barrier' | 'switch' | 'cableDuct', id: string) => void; // Updated onFeatureDelete
  onRescaleDrawEnd: (drawnLengthMeters: number) => void;
  beaconPrice: number; // Passed for new beacon creation
  antennaPrice: number; // Passed for new antenna creation
}

const MapCore: React.FC<MapCoreProps> = ({
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
  activeInteraction,
  onFeatureAdd,
  onFeatureModify,
  onFeatureDelete,
  onRescaleDrawEnd,
  beaconPrice,
  antennaPrice,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<Map | null>(null);
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);

  const beaconVectorSource = useRef(new VectorSource({ features: [] }));
  const beaconVectorLayer = useRef(new VectorLayer({ source: beaconVectorSource.current }));

  const antennaVectorSource = useRef(new VectorSource({ features: [] }));
  const antennaVectorLayer = useRef(new VectorLayer({ source: antennaVectorSource.current }));

  const barrierVectorSource = useRef(new VectorSource({ features: [] }));
  const barrierVectorLayer = useRef(new VectorLayer({ source: barrierVectorSource.current }));

  const zoneVectorSource = useRef(new VectorSource({ features: [] }));
  const zoneVectorLayer = useRef(new VectorLayer({ source: zoneVectorSource.current }));

  const switchVectorSource = useRef(new VectorSource({ features: [] }));
  const switchVectorLayer = useRef(new VectorLayer({ source: switchVectorSource.current }));

  const cableDuctVectorSource = useRef(new VectorSource({ features: [] }));
  const cableDuctVectorLayer = useRef(new VectorLayer({ source: cableDuctVectorSource.current }));

  const rescaleDrawSource = useRef(new VectorSource({ features: [] }));
  const rescaleDrawLayer = useRef(new VectorLayer({ source: rescaleDrawSource.current }));

  // Refs for managing OpenLayers interactions
  const drawInteractionRef = useRef<Draw | null>(null);
  const modifyInteractionRef = useRef<Modify | null>(null);
  const snapInteractionRef = useRef<Snap | null>(null);
  const clickListenerRef = useRef<((event: any) => void) | null>(null);

  const cableDuctLineStyle = useMemo(() => new Style({
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
      beaconVectorLayer.current.changed();
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
      antennaVectorLayer.current.changed();
    }
  }, [mapInstance, getAntennaStyle, hoveredFeatureId]);

  useEffect(() => {
    if (mapInstance) {
      barrierVectorLayer.current.setStyle((feature) => {
        const styles = [barrierStyle];
        if (feature.get('id') === hoveredFeatureId && (activeInteraction === 'deleteBarrier')) {
          styles.push(barrierHoverStyle);
        }
        return styles;
      });
      barrierVectorLayer.current.changed();
    }
  }, [mapInstance, hoveredFeatureId, activeInteraction]);

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
        if (feature.get('id') === hoveredFeatureId && (activeInteraction === 'deleteZone')) {
          styles.push(zoneHoverStyle);
        }
        return styles;
      });
      zoneVectorLayer.current.changed();
    }
  }, [mapInstance, hoveredFeatureId, activeInteraction]);

  useEffect(() => {
    if (mapInstance) {
      switchVectorLayer.current.setStyle((feature) => {
        const styles = [switchStyle];
        if (feature.get('id') === hoveredFeatureId) {
          styles.push(hoverStyle);
        }
        return styles;
      });
      switchVectorLayer.current.changed();
    }
  }, [mapInstance, hoveredFeatureId]);

  useEffect(() => {
    if (mapInstance) {
      cableDuctVectorLayer.current.setStyle((feature) => getCableDuctStyle(feature));
      cableDuctVectorLayer.current.changed();
    }
  }, [mapInstance, getCableDuctStyle]);

  // Effect to update layer visibility
  useEffect(() => {
    if (mapInstance) {
      beaconVectorLayer.current.setVisible(showBeacons);
      antennaVectorLayer.current.setVisible(showAntennas);
      barrierVectorLayer.current.setVisible(showBarriers);
      zoneVectorLayer.current.setVisible(showZones);
      switchVectorLayer.current.setVisible(showSwitches);
      cableDuctVectorLayer.current.setVisible(showCableDucts);
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
  }, [beacons]);

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
  }, [antennas]);

  // Effect to update barrier features
  useEffect(() => {
    barrierVectorSource.current.clear();
    barriers.forEach(coords => {
      // Assign a unique ID to each barrier feature for deletion
      const id = JSON.stringify(coords); // Using stringified coords as ID
      const polygon = new Polygon(coords);
      const feature = new Feature({ geometry: polygon, id: id });
      barrierVectorSource.current.addFeature(feature);
    });
  }, [barriers]);

  // Effect to update zone features and display beacon count
  useEffect(() => {
    zoneVectorSource.current.clear();
    zones.forEach(zone => {
      const polygon = new Polygon(zone.polygon);
      const feature = new Feature({ geometry: polygon, id: zone.id, beaconCount: zone.beaconCount });
      zoneVectorSource.current.addFeature(feature);
    });
  }, [zones]);

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
  }, [switches]);

  // Effect to update cable duct features
  useEffect(() => {
    cableDuctVectorSource.current.clear();
    cableDucts.forEach(cableDuct => {
      const feature = new Feature({
        geometry: new LineString(cableDuct.path),
        id: cableDuct.id,
        type: cableDuct.type,
      });
      cableDuctVectorSource.current.addFeature(feature);
    });
  }, [cableDucts]);

  // Consolidated useEffect for managing all map interactions
  useEffect(() => {
    if (!mapInstance) return;

    // Cleanup function to remove all interactions
    const cleanupInteractions = () => {
      if (drawInteractionRef.current) {
        mapInstance.removeInteraction(drawInteractionRef.current);
        drawInteractionRef.current = null;
      }
      if (modifyInteractionRef.current) {
        mapInstance.removeInteraction(modifyInteractionRef.current);
        modifyInteractionRef.current = null;
      }
      if (snapInteractionRef.current) {
        mapInstance.removeInteraction(snapInteractionRef.current);
        snapInteractionRef.current = null;
      }
      if (clickListenerRef.current) {
        mapInstance.un('click', clickListenerRef.current);
        clickListenerRef.current = null;
      }
      rescaleDrawSource.current.clear(); // Clear any drawing for rescale
    };

    // Call cleanup before setting new interactions
    cleanupInteractions();

    let newInteraction: Interaction | null = null;
    let newClickListener: ((event: any) => void) | null = null;
    let newSnapInteraction: Snap | null = null;

    switch (activeInteraction) {
      case 'drawBarrier':
        newInteraction = new Draw({
          source: barrierVectorSource.current,
          type: 'Polygon',
          style: sketchStyle,
        });
        (newInteraction as Draw).on('drawend', (event: any) => {
          const coords = event.feature.getGeometry()?.getCoordinates() as Coordinate[][][];
          onFeatureAdd('barrier', coords);
          showSuccess('Барьер добавлен!');
        });
        newSnapInteraction = new Snap({ source: barrierVectorSource.current });
        break;
      case 'drawZone':
        newInteraction = new Draw({
          source: zoneVectorSource.current,
          type: 'Polygon',
          style: sketchStyle,
        });
        (newInteraction as Draw).on('drawend', (event: any) => {
          onFeatureAdd('zone', {
            id: `zone-${Date.now()}`,
            polygon: event.feature.getGeometry()?.getCoordinates() as Coordinate[][][],
            beaconCount: 0,
          });
          showSuccess('Зона добавлена вручную!');
        });
        newSnapInteraction = new Snap({ source: zoneVectorSource.current });
        break;
      case 'drawCableDuct':
        newInteraction = new Draw({
          source: cableDuctVectorSource.current,
          type: 'LineString',
          style: sketchStyle,
        });
        (newInteraction as Draw).on('drawend', (event: any) => {
          onFeatureAdd('cableDuct', {
            id: `cableDuct-${Date.now()}`,
            path: event.feature.getGeometry()?.getCoordinates() as Coordinate[],
            type: 'main',
          });
          showSuccess('Кабель-канал добавлен!');
        });
        newSnapInteraction = new Snap({ source: cableDuctVectorSource.current });
        break;
      case 'editBeacon':
        newInteraction = new Modify({
          source: beaconVectorSource.current,
          style: sketchStyle,
        });
        (newInteraction as Modify).on('modifyend', (event: any) => {
          event.features.forEach((feature: Feature) => {
            const id = feature.get('id');
            const geometry = feature.getGeometry();
            if (id && geometry instanceof Point) {
              onFeatureModify('beacon', id, geometry.getCoordinates() as Coordinate);
            }
          });
          showSuccess('Позиция маяка обновлена!');
        });
        newSnapInteraction = new Snap({ source: beaconVectorSource.current });
        break;
      case 'editAntenna':
        newInteraction = new Modify({
          source: antennaVectorSource.current,
          style: sketchStyle,
        });
        (newInteraction as Modify).on('modifyend', (event: any) => {
          event.features.forEach((feature: Feature) => {
            const id = feature.get('id');
            const geometry = feature.getGeometry();
            if (id && geometry instanceof Point) {
              onFeatureModify('antenna', id, geometry.getCoordinates() as Coordinate);
            }
          });
          showSuccess('Позиция антенны обновлена!');
        });
        newSnapInteraction = new Snap({ source: antennaVectorSource.current });
        break;
      case 'editSwitch':
        newInteraction = new Modify({
          source: switchVectorSource.current,
          style: sketchStyle,
        });
        (newInteraction as Modify).on('modifyend', (event: any) => {
          event.features.forEach((feature: Feature) => {
            const id = feature.get('id');
            const geometry = feature.getGeometry();
            if (id && geometry instanceof Point) {
              onFeatureModify('switch', id, geometry.getCoordinates() as Coordinate);
            }
          });
          showSuccess('Позиция коммутатора обновлена!');
        });
        newSnapInteraction = new Snap({ source: switchVectorSource.current });
        break;
      case 'editCableDuct':
        newInteraction = new Modify({
          source: cableDuctVectorSource.current,
          style: sketchStyle,
        });
        (newInteraction as Modify).on('modifyend', (event: any) => {
          event.features.forEach((feature: Feature) => {
            const id = feature.get('id');
            const geometry = feature.getGeometry();
            if (id && geometry instanceof LineString) {
              onFeatureModify('cableDuct', id, geometry.getCoordinates() as Coordinate[]);
            }
          });
          showSuccess('Кабель-канал обновлен!');
        });
        newSnapInteraction = new Snap({ source: cableDuctVectorSource.current });
        break;
      case 'rescale':
        newInteraction = new Draw({
          source: rescaleDrawSource.current,
          type: 'LineString',
          style: rescaleLineStyle,
          maxPoints: 2,
        });
        (newInteraction as Draw).on('drawend', (event: any) => {
          const geometry = event.feature.getGeometry();
          if (geometry instanceof LineString) {
            const coords = geometry.getCoordinates();
            if (coords.length === 2) {
              const [startCoord, endCoord] = coords;
              const drawnLengthMeters = Math.sqrt(
                Math.pow(endCoord[0] - startCoord[0], 2) +
                Math.pow(endCoord[1] - startCoord[1], 2)
              );
              onRescaleDrawEnd(drawnLengthMeters);
            }
          }
        });
        break;
      case 'manualBeacon':
      case 'manualAntenna':
      case 'manualSwitch':
      case 'deleteBeacon':
      case 'deleteAntenna':
      case 'deleteZone':
      case 'deleteBarrier': // Added deleteBarrier case
      case 'deleteSwitch':
      case 'deleteCableDuct':
        newClickListener = (event: any) => {
          const coordinate = event.coordinate;

          if (activeInteraction === 'manualBeacon') {
            onFeatureAdd('beacon', {
              id: `beacon-${Date.now()}`,
              position: coordinate,
              price: beaconPrice,
            });
            showSuccess('Маяк добавлен вручную!');
          } else if (activeInteraction === 'manualAntenna') {
            onFeatureAdd('antenna', {
              id: `antenna-${Date.now()}`,
              position: coordinate,
              height: 2, // Default height
              angle: 0, // Default angle
              range: 10, // Default range
              price: antennaPrice,
            });
            showSuccess('Антенна добавлена вручную!');
          } else if (activeInteraction === 'manualSwitch') {
            onFeatureAdd('switch', {
              id: `switch-${Date.now()}`,
              position: coordinate,
            });
            showSuccess('Коммутатор добавлен вручную!');
          } else if (activeInteraction === 'deleteBeacon') {
            mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
              const featureId = feature.get('id');
              if (featureId && feature.getGeometry()?.getType() === 'Point') {
                onFeatureDelete('beacon', featureId);
                showSuccess('Маяк удален!');
                return true;
              }
              return false;
            }, {
              layerFilter: (layer) => layer === beaconVectorLayer.current,
              hitTolerance: 5,
            });
          } else if (activeInteraction === 'deleteAntenna') {
            mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
              const featureId = feature.get('id');
              if (featureId && feature.getGeometry()?.getType() === 'Point') {
                onFeatureDelete('antenna', featureId);
                showSuccess('Антенна удалена!');
                return true;
              }
              return false;
            }, {
              layerFilter: (layer) => layer === antennaVectorLayer.current,
              hitTolerance: 5,
            });
          } else if (activeInteraction === 'deleteZone') {
            mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
              const featureId = feature.get('id');
              if (featureId && feature.getGeometry()?.getType() === 'Polygon') {
                onFeatureDelete('zone', featureId);
                showSuccess('Зона удалена!');
                return true;
              }
              return false;
            }, {
              layerFilter: (layer) => layer === zoneVectorLayer.current,
              hitTolerance: 5,
            });
          } else if (activeInteraction === 'deleteBarrier') { // Handle barrier deletion
            mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
              const featureId = feature.get('id'); // This will be the stringified coords
              if (featureId && feature.getGeometry()?.getType() === 'Polygon') {
                onFeatureDelete('barrier', featureId);
                showSuccess('Барьер удален!');
                return true;
              }
              return false;
            }, {
              layerFilter: (layer) => layer === barrierVectorLayer.current,
              hitTolerance: 5,
            });
          } else if (activeInteraction === 'deleteSwitch') {
            mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
              const featureId = feature.get('id');
              if (featureId && feature.getGeometry()?.getType() === 'Point') {
                onFeatureDelete('switch', featureId);
                showSuccess('Коммутатор удален!');
                return true;
              }
              return false;
            }, {
              layerFilter: (layer) => layer === switchVectorLayer.current,
              hitTolerance: 5,
            });
          } else if (activeInteraction === 'deleteCableDuct') {
            mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
              const featureId = feature.get('id');
              if (featureId && feature.getGeometry()?.getType() === 'LineString') {
                onFeatureDelete('cableDuct', featureId);
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
        break;
    }

    // Store and add new interactions
    if (newInteraction) {
      drawInteractionRef.current = newInteraction as Draw;
      mapInstance.addInteraction(drawInteractionRef.current);
    }
    if (newSnapInteraction) {
      snapInteractionRef.current = newSnapInteraction;
      mapInstance.addInteraction(snapInteractionRef.current);
    }
    if (newClickListener) {
      clickListenerRef.current = newClickListener;
      mapInstance.on('click', clickListenerRef.current);
    }

    return cleanupInteractions; // Return cleanup function for useEffect
  }, [
    mapInstance,
    activeInteraction,
    sketchStyle,
    rescaleLineStyle,
    onFeatureAdd,
    onFeatureModify,
    onFeatureDelete,
    onRescaleDrawEnd,
    beaconPrice,
    antennaPrice,
  ]);

  // Effect for pointermove to detect hovered features
  useEffect(() => {
    if (!mapInstance) return;

    const handlePointerMove = (event: any) => {
      let foundFeatureId: string | null = null;
      const deletionModes = ['deleteBeacon', 'deleteAntenna', 'deleteZone', 'deleteBarrier', 'deleteSwitch', 'deleteCableDuct'];

      if (deletionModes.includes(activeInteraction || '')) {
        mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
          const featureId = feature.get('id');
          if (featureId) {
            const geomType = feature.getGeometry()?.getType();
            if (
              (activeInteraction === 'deleteBeacon' && geomType === 'Point' && beacons.some(b => b.id === featureId)) ||
              (activeInteraction === 'deleteAntenna' && geomType === 'Point' && antennas.some(a => a.id === featureId)) ||
              (activeInteraction === 'deleteZone' && geomType === 'Polygon' && zones.some(z => z.id === featureId)) ||
              (activeInteraction === 'deleteBarrier' && geomType === 'Polygon' && barriers.some(b => JSON.stringify(b) === featureId)) || // Check for barrier ID
              (activeInteraction === 'deleteSwitch' && geomType === 'Point' && switches.some(s => s.id === featureId)) ||
              (activeInteraction === 'deleteCableDuct' && geomType === 'LineString' && cableDucts.some(c => c.id === featureId))
            ) {
              foundFeatureId = featureId;
              return true;
            }
          }
          return false;
        }, {
          layerFilter: (layer) =>
            layer === beaconVectorLayer.current ||
            layer === antennaVectorLayer.current ||
            layer === zoneVectorLayer.current ||
            layer === barrierVectorLayer.current || // Include barrier layer
            layer === switchVectorLayer.current ||
            layer === cableDuctVectorLayer.current,
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
  }, [mapInstance, activeInteraction, beacons, antennas, zones, barriers, switches, cableDucts]);

  return (
    <div ref={mapRef} className="w-full h-[600px] border rounded-md" />
  );
};

export default MapCore;