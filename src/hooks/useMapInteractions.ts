import { useEffect, useRef } from 'react';
import { Map } from 'ol';
import { Draw, Modify, Snap, Interaction } from 'ol/interaction';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import { Coordinate } from 'ol/coordinate';
import { showSuccess } from '@/utils/toast';
import { sketchStyle, rescaleLineStyle } from '@/utils/mapStyles';

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
  | 'deleteSwitch'
  | 'deleteCableDuct'
  | 'rescale'
  | null;

interface UseMapInteractionsProps {
  mapInstance: Map | null;
  activeInteraction: MapInteractionType;
  beaconVectorSource: React.MutableRefObject<VectorSource>;
  antennaVectorSource: React.MutableRefObject<VectorSource>;
  barrierVectorSource: React.MutableRefObject<VectorSource>;
  zoneVectorSource: React.MutableRefObject<VectorSource>;
  switchVectorSource: React.MutableRefObject<VectorSource>;
  cableDuctVectorSource: React.MutableRefObject<VectorSource>;
  rescaleDrawSource: React.MutableRefObject<VectorSource>;
  onFeatureAdd: (type: 'beacon' | 'antenna' | 'barrier' | 'zone' | 'switch' | 'cableDuct', featureData: any) => void;
  onFeatureModify: (type: 'beacon' | 'antenna' | 'switch' | 'cableDuct', id: string, newPosition: Coordinate | Coordinate[]) => void;
  onFeatureDelete: (type: 'beacon' | 'antenna' | 'zone' | 'switch' | 'cableDuct', id: string) => void;
  onRescaleDrawEnd: (drawnLengthMeters: number) => void;
  beaconPrice: number;
  antennaPrice: number;
}

export const useMapInteractions = ({
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
}: UseMapInteractionsProps) => {
  useEffect(() => {
    if (!mapInstance) return;

    let currentInteraction: Interaction | null = null;
    let currentClickListener: ((event: any) => void) | null = null;
    let currentSnapInteraction: Snap | null = null;

    rescaleDrawSource.current.clear();

    mapInstance.getInteractions().forEach(interaction => {
      if (interaction instanceof Draw || interaction instanceof Modify || interaction instanceof Snap) {
        mapInstance.removeInteraction(interaction);
      }
    });
    mapInstance.un('click', currentClickListener || (() => {}));

    switch (activeInteraction) {
      case 'drawBarrier':
        currentInteraction = new Draw({
          source: barrierVectorSource.current,
          type: 'Polygon',
          style: sketchStyle,
        });
        (currentInteraction as Draw).on('drawend', (event: any) => {
          onFeatureAdd('barrier', event.feature.getGeometry()?.getCoordinates() as Coordinate[][][]);
          showSuccess('Барьер добавлен!');
        });
        currentSnapInteraction = new Snap({ source: barrierVectorSource.current });
        break;
      case 'drawZone':
        currentInteraction = new Draw({
          source: zoneVectorSource.current,
          type: 'Polygon',
          style: sketchStyle,
        });
        (currentInteraction as Draw).on('drawend', (event: any) => {
          onFeatureAdd('zone', {
            id: `zone-${Date.now()}`,
            polygon: event.feature.getGeometry()?.getCoordinates() as Coordinate[][][],
            beaconCount: 0,
          });
          showSuccess('Зона добавлена вручную!');
        });
        currentSnapInteraction = new Snap({ source: zoneVectorSource.current });
        break;
      case 'drawCableDuct':
        currentInteraction = new Draw({
          source: cableDuctVectorSource.current,
          type: 'LineString',
          style: sketchStyle,
        });
        (currentInteraction as Draw).on('drawend', (event: any) => {
          onFeatureAdd('cableDuct', {
            id: `cableDuct-${Date.now()}`,
            path: event.feature.getGeometry()?.getCoordinates() as Coordinate[],
            type: 'main',
          });
          showSuccess('Кабель-канал добавлен!');
        });
        currentSnapInteraction = new Snap({ source: cableDuctVectorSource.current });
        break;
      case 'editBeacon':
        currentInteraction = new Modify({
          source: beaconVectorSource.current,
          style: sketchStyle,
        });
        (currentInteraction as Modify).on('modifyend', (event: any) => {
          event.features.forEach((feature: Feature) => {
            const id = feature.get('id');
            const geometry = feature.getGeometry();
            if (id && geometry instanceof Point) {
              onFeatureModify('beacon', id, geometry.getCoordinates() as Coordinate);
            }
          });
          showSuccess('Позиция маяка обновлена!');
        });
        currentSnapInteraction = new Snap({ source: beaconVectorSource.current });
        break;
      case 'editAntenna':
        currentInteraction = new Modify({
          source: antennaVectorSource.current,
          style: sketchStyle,
        });
        (currentInteraction as Modify).on('modifyend', (event: any) => {
          event.features.forEach((feature: Feature) => {
            const id = feature.get('id');
            const geometry = feature.getGeometry();
            if (id && geometry instanceof Point) {
              onFeatureModify('antenna', id, geometry.getCoordinates() as Coordinate);
            }
          });
          showSuccess('Позиция антенны обновлена!');
        });
        currentSnapInteraction = new Snap({ source: antennaVectorSource.current });
        break;
      case 'editSwitch':
        currentInteraction = new Modify({
          source: switchVectorSource.current,
          style: sketchStyle,
        });
        (currentInteraction as Modify).on('modifyend', (event: any) => {
          event.features.forEach((feature: Feature) => {
            const id = feature.get('id');
            const geometry = feature.getGeometry();
            if (id && geometry instanceof Point) {
              onFeatureModify('switch', id, geometry.getCoordinates() as Coordinate);
            }
          });
          showSuccess('Позиция коммутатора обновлена!');
        });
        currentSnapInteraction = new Snap({ source: switchVectorSource.current });
        break;
      case 'editCableDuct':
        currentInteraction = new Modify({
          source: cableDuctVectorSource.current,
          style: sketchStyle,
        });
        (currentInteraction as Modify).on('modifyend', (event: any) => {
          event.features.forEach((feature: Feature) => {
            const id = feature.get('id');
            const geometry = feature.getGeometry();
            if (id && geometry instanceof LineString) {
              onFeatureModify('cableDuct', id, geometry.getCoordinates() as Coordinate[]);
            }
          });
          showSuccess('Кабель-канал обновлен!');
        });
        currentSnapInteraction = new Snap({ source: cableDuctVectorSource.current });
        break;
      case 'rescale':
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
      case 'deleteSwitch':
      case 'deleteCableDuct':
        currentClickListener = (event: any) => {
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
              height: 2,
              angle: 0,
              range: 10,
              price: antennaPrice,
              type: 'aoa', // Default to AOA, will be overridden by specific pages
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
              layerFilter: (layer) => layer === beaconVectorSource.current.getLayers()[0], // Assuming layer is directly from source
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
              layerFilter: (layer) => layer === antennaVectorSource.current.getLayers()[0],
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
              layerFilter: (layer) => layer === zoneVectorSource.current.getLayers()[0],
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
              layerFilter: (layer) => layer === switchVectorSource.current.getLayers()[0],
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
              layerFilter: (layer) => layer === cableDuctVectorSource.current.getLayers()[0],
              hitTolerance: 5,
            });
          }
        };
        break;
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
  ]);
};