import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { Coordinate } from 'ol/coordinate';

// Определения интерфейсов
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

// Интерфейс для состояния карты
interface MapState {
  mapImageSrc: string | null;
  mapWidthMeters: number;
  mapHeightMeters: number;
  beacons: Beacon[];
  antennas: Antenna[];
  barriers: Coordinate[][][][];
  zones: Zone[];
  switches: Switch[];
  cableDucts: CableDuct[];
  beaconPrice: number;
  antennaPrice: number;
  cablePricePerMeter: number;
  // Visibility states
  showBeacons: boolean;
  showAntennas: boolean;
  showBarriers: boolean;
  showAntennaRanges: boolean;
  showZones: boolean;
  showSwitches: boolean;
  showCableDucts: boolean;
  showCableDuctLengths: boolean;
}

// Интерфейс для функций обновления состояния
interface MapActions {
  setMapImageSrc: (src: string | null) => void;
  setMapDimensions: (width: number, height: number) => void;
  setBeacons: (beacons: Beacon[]) => void;
  setAntennas: (antennas: Antenna[]) => void;
  setBarriers: (barriers: Coordinate[][][][]) => void;
  setZones: (zones: Zone[]) => void;
  setSwitches: (switches: Switch[]) => void;
  setCableDucts: (cableDucts: CableDuct[]) => void;
  setBeaconPrice: (price: number) => void;
  setAntennaPrice: (price: number) => void;
  setCablePricePerMeter: (price: number) => void;
  // Visibility toggles
  toggleShowBeacons: () => void;
  toggleShowAntennas: () => void;
  toggleShowBarriers: () => void;
  toggleShowAntennaRanges: () => void;
  toggleShowZones: () => void;
  toggleShowSwitches: () => void;
  toggleShowCableDucts: () => void;
  toggleShowCableDuctLengths: () => void;
  // Reset all map data
  resetMapData: () => void;
  // Load configuration
  loadMapConfiguration: (config: SavedMapConfig) => void;
}

// Define the structure for the saved configuration (same as in Index.tsx)
interface SavedMapConfig {
  mapImageSrc: string;
  mapWidthMeters: number;
  mapHeightMeters: number;
  beacons: Beacon[];
  antennas: Antenna[];
  barriers: Coordinate[][][][];
  zones: Zone[];
  switches: Switch[];
  cableDucts: CableDuct[];
  cablePricePerMeter?: number;
  defaultBeaconPrice?: number;
  defaultAntennaPrice?: number;
}

const defaultMapState: MapState = {
  mapImageSrc: null,
  mapWidthMeters: 100,
  mapHeightMeters: 100,
  beacons: [],
  antennas: [],
  barriers: [],
  zones: [],
  switches: [],
  cableDucts: [],
  beaconPrice: 10,
  antennaPrice: 50,
  cablePricePerMeter: 1,
  showBeacons: true,
  showAntennas: true,
  showBarriers: true,
  showAntennaRanges: true,
  showZones: true,
  showSwitches: true,
  showCableDucts: true,
  showCableDuctLengths: true,
};

const MapContext = createContext<{ state: MapState; actions: MapActions } | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mapState, setMapState] = useState<MapState>(defaultMapState);

  const actions: MapActions = {
    setMapImageSrc: useCallback((src) => setMapState(prev => ({ ...prev, mapImageSrc: src })), []),
    setMapDimensions: useCallback((width, height) => setMapState(prev => ({ ...prev, mapWidthMeters: width, mapHeightMeters: height })), []),
    setBeacons: useCallback((beacons) => setMapState(prev => ({ ...prev, beacons })), []),
    setAntennas: useCallback((antennas) => setMapState(prev => ({ ...prev, antennas })), []),
    setBarriers: useCallback((barriers) => setMapState(prev => ({ ...prev, barriers })), []),
    setZones: useCallback((zones) => setMapState(prev => ({ ...prev, zones })), []),
    setSwitches: useCallback((switches) => setMapState(prev => ({ ...prev, switches })), []),
    setCableDucts: useCallback((cableDucts) => setMapState(prev => ({ ...prev, cableDucts })), []),
    setBeaconPrice: useCallback((price) => setMapState(prev => ({ ...prev, beaconPrice: price })), []),
    setAntennaPrice: useCallback((price) => setMapState(prev => ({ ...prev, antennaPrice: price })), []),
    setCablePricePerMeter: useCallback((price) => setMapState(prev => ({ ...prev, cablePricePerMeter: price })), []),
    toggleShowBeacons: useCallback(() => setMapState(prev => ({ ...prev, showBeacons: !prev.showBeacons })), []),
    toggleShowAntennas: useCallback(() => setMapState(prev => ({ ...prev, showAntennas: !prev.showAntennas })), []),
    toggleShowBarriers: useCallback(() => setMapState(prev => ({ ...prev, showBarriers: !prev.showBarriers })), []),
    toggleShowAntennaRanges: useCallback(() => setMapState(prev => ({ ...prev, showAntennaRanges: !prev.showAntennaRanges })), []),
    toggleShowZones: useCallback(() => setMapState(prev => ({ ...prev, showZones: !prev.showZones })), []),
    toggleShowSwitches: useCallback(() => setMapState(prev => ({ ...prev, showSwitches: !prev.showSwitches })), []),
    toggleShowCableDucts: useCallback(() => setMapState(prev => ({ ...prev, showCableDucts: !prev.showCableDucts })), []),
    toggleShowCableDuctLengths: useCallback(() => setMapState(prev => ({ ...prev, showCableDuctLengths: !prev.showCableDuctLengths })), []),
    resetMapData: useCallback(() => setMapState(defaultMapState), []),
    loadMapConfiguration: useCallback((config: SavedMapConfig) => {
      setMapState(prev => ({
        ...prev,
        mapImageSrc: config.mapImageSrc,
        mapWidthMeters: config.mapWidthMeters,
        mapHeightMeters: config.mapHeightMeters,
        beacons: config.beacons || [],
        antennas: config.antennas || [],
        barriers: config.barriers || [],
        zones: config.zones || [],
        switches: config.switches || [],
        cableDucts: config.cableDucts?.map(duct => ({ ...duct, type: duct.type || 'main' })) || [],
        cablePricePerMeter: config.cablePricePerMeter ?? 1,
        beaconPrice: config.defaultBeaconPrice ?? 10,
        antennaPrice: config.defaultAntennaPrice ?? 50,
      }));
    }, []),
  };

  return (
    <MapContext.Provider value={{ state: mapState, actions }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = () => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
};