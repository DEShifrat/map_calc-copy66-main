import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Map, View } from 'ol';
import ImageLayer from 'ol/layer/Image';
import ImageStatic from 'ol/source/ImageStatic';
import { Projection } from 'ol/proj';
import { getCenter } from 'ol/extent';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import LineString from 'ol/geom/LineString';
import Style from 'ol/style/Style';
import Text from 'ol/style/Text';
import { Coordinate } from 'ol/coordinate';
import { useMapInteractions, MapInteractionType } from '@/hooks/useMapInteractions';
import {
  beaconStyle,
  barrierStyle,
  zoneStyle,
  switchStyle,
  hoverStyle,
  zoneHoverStyle,
  getAntennaStyle,
  getCableDuctStyle,
} from '@/utils/mapStyles';

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
  type: 'aoa' | 'zonal';
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
  onFeatureDelete: (type: 'beacon' | 'antenna' | 'zone' | 'switch' | 'cableDuct', id: string) => void;
  onRescaleDrawEnd: (drawnLengthMeters: number) => void;
  beaconPrice: number;
  antennaPrice: number;
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

  // Initialize map
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

  // Use the custom hook for interactions
  useMapInteractions({
    mapInstance,
    activeInteraction,
    beaconVectorSource,
    antennaVectorSource,
    barrierVectorSource,
    zoneVectorSource,
    switchVectorSource,
    cableDuctVectorSource,
    rescaleDrawSource,
    onFeatureAdd,
    onFeatureModify,
    onFeatureDelete,
    onRescaleDrawEnd,
    beaconPrice,
    antennaPrice,
  });

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
        const styles = getAntennaStyle(feature, showAntennaRanges);
        if (feature.get('id') === hoveredFeatureId) {
          styles.push(hoverStyle);
        }
        return styles;
      });
      antennaVectorLayer.current.changed();
    }
  }, [mapInstance, showAntennaRanges, hoveredFeatureId]);

  useEffect(() => {
    if (mapInstance) {
      barrierVectorLayer.current.setStyle(barrierStyle);
      barrierVectorLayer.current.changed();
    }
  }, [mapInstance]);

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
      cableDuctVectorLayer.current.setStyle((feature) => getCableDuctStyle(feature, showCableDuctLengths, hoveredFeatureId));
      cableDuctVectorLayer.current.changed();
    }
  }, [mapInstance, showCableDuctLengths, hoveredFeatureId]);

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
        type: antenna.type,
      });
      antennaVectorSource.current.addFeature(feature);
    });
  }, [antennas]);

  // Effect to update barrier features
  useEffect(() => {
    barrierVectorSource.current.clear();
    barriers.forEach(coords => {
      const polygon = new Polygon(coords);
      const feature = new Feature({ geometry: polygon });
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

  // Effect for pointermove to detect hovered features
  useEffect(() => {
    if (!mapInstance) return;

    const handlePointerMove = (event: any) => {
      let foundFeatureId: string | null = null;
      const deletionModes = ['deleteBeacon', 'deleteAntenna', 'deleteZone', 'deleteSwitch', 'deleteCableDuct'];

      if (deletionModes.includes(activeInteraction || '')) {
        mapInstance.forEachFeatureAtPixel(event.pixel, (feature) => {
          const featureId = feature.get('id');
          if (featureId) {
            const geomType = feature.getGeometry()?.getType();
            if (
              (activeInteraction === 'deleteBeacon' && geomType === 'Point' && beacons.some(b => b.id === featureId)) ||
              (activeInteraction === 'deleteAntenna' && geomType === 'Point' && antennas.some(a => a.id === featureId)) ||
              (activeInteraction === 'deleteZone' && geomType === 'Polygon' && zones.some(z => z.id === featureId)) ||
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
  }, [mapInstance, activeInteraction, beacons, antennas, zones, switches, cableDucts]);

  return (
    <div ref={mapRef} className="w-full h-[600px] border rounded-md" />
  );
};

export default MapCore;