import React, { createContext, useReducer, useContext, useCallback, ReactNode, useMemo } from 'react';
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

export interface Zone { // Добавлен export
  id: string;
  polygon: Coordinate[][]; // Изменено с Coordinate[][][] на Coordinate[][]
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
  barriers: Coordinate[][][]; // Изменено с Coordinate[][][][] на Coordinate[][][]
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

// Интерфейс для сохраненной конфигурации
interface SavedMapConfig {
  mapImageSrc: string;
  mapWidthMeters: number;
  mapHeightMeters: number;
  beacons: Beacon[];
  antennas: Antenna[];
  barriers: Coordinate[][][]; // Изменено с Coordinate[][][][] на Coordinate[][][]
  zones: Zone[];
  switches: Switch[];
  cableDucts: CableDuct[];
  cablePricePerMeter?: number;
  defaultBeaconPrice?: number;
  defaultAntennaPrice?: number;
}

// Состояние для управления историей
interface MapHistoryState {
  current: MapState;
  history: MapState[];
  historyIndex: number;
}

// Типы действий для редьюсера
type MapHistoryAction =
  | { type: 'UPDATE_STATE'; payload: Partial<MapState> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET_MAP_DATA' }
  | { type: 'LOAD_CONFIGURATION'; payload: SavedMapConfig }
  | { type: 'DELETE_CABLE_DUCT_SEGMENT'; payload: { id: string; segmentIndex: number } }
  | { type: 'UPDATE_BARRIER'; payload: { oldCoords: Coordinate[][][]; newCoords: Coordinate[][][] } }; // Добавлен новый тип действия

const MAX_HISTORY_SIZE = 20; // Максимальное количество состояний в истории

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

// Редьюсер для управления состоянием карты и историей
const mapHistoryReducer = (state: MapHistoryState, action: MapHistoryAction): MapHistoryState => {
  switch (action.type) {
    case 'UPDATE_STATE': {
      const newCurrentState = { ...state.current, ...action.payload };
      // Если мы не в конце истории, обрезаем ее
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(newCurrentState);
      // Ограничиваем размер истории
      const limitedHistory = newHistory.slice(Math.max(0, newHistory.length - MAX_HISTORY_SIZE));
      const newIndex = limitedHistory.length - 1;
      return {
        current: newCurrentState,
        history: limitedHistory,
        historyIndex: newIndex,
      };
    }
    case 'UNDO': {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          ...state,
          current: state.history[newIndex],
          historyIndex: newIndex,
        };
      }
      return state;
    }
    case 'REDO': {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          ...state,
          current: state.history[newIndex],
          historyIndex: newIndex,
        };
      }
      return state;
    }
    case 'RESET_MAP_DATA': {
      return {
        current: defaultMapState,
        history: [defaultMapState],
        historyIndex: 0,
      };
    }
    case 'LOAD_CONFIGURATION': {
      const config = action.payload;
      const loadedState: MapState = {
        ...defaultMapState, // Начинаем с дефолтного состояния, чтобы убедиться, что все свойства присутствуют
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
        // Сохраняем текущие состояния видимости слоев
        showBeacons: state.current.showBeacons,
        showAntennas: state.current.showAntennas,
        showBarriers: state.current.showBarriers,
        showAntennaRanges: state.current.showAntennaRanges,
        showZones: state.current.showZones,
        showSwitches: state.current.showSwitches,
        showCableDucts: state.current.showCableDucts,
        showCableDuctLengths: state.current.showCableDuctLengths,
      };
      return {
        current: loadedState,
        history: [loadedState],
        historyIndex: 0,
      };
    }
    case 'DELETE_CABLE_DUCT_SEGMENT': {
      const { id, segmentIndex } = action.payload;

      const updatedCableDucts = state.current.cableDucts.flatMap(duct => {
        if (duct.id === id) {
          const path = [...duct.path];

          // Если кабель-канал имеет менее 2 точек (т.е. 0 или 1 отрезок)
          // или segmentIndex выходит за пределы допустимого для отрезков,
          // то удаляем весь кабель-канал.
          if (path.length < 2 || segmentIndex < 0 || segmentIndex >= path.length - 1) {
            return []; // Удаляем кабель-канал
          }

          // Создаем новый путь, удаляя точку, которая является концом удаляемого отрезка
          // и началом следующего. Это эффективно "сглаживает" линию.
          // Например, если path = [P0, P1, P2, P3] и удаляем segmentIndex = 1 (P1-P2),
          // то удаляем P2 (path[segmentIndex + 1]), и новый путь будет [P0, P1, P3].
          const newPath = path.filter((_, idx) => idx !== segmentIndex + 1);

          // Если после удаления путь имеет менее 2 точек, удаляем весь кабель-канал.
          if (newPath.length < 2) {
            return [];
          }

          // Возвращаем измененный кабель-канал с новым ID, чтобы React корректно его перерисовал
          // и для обеспечения иммутабельности в истории.
          return [{
            ...duct,
            id: `${duct.id}-modified-${Date.now()}-${Math.random().toString(36).substring(2)}`,
            path: newPath,
          }];
        }
        return [duct]; // Оставляем другие кабель-каналы без изменений
      });
      return mapHistoryReducer(state, { type: 'UPDATE_STATE', payload: { cableDucts: updatedCableDucts } });
    }
    case 'UPDATE_BARRIER': { // Новый обработчик для обновления барьера
      const { oldCoords, newCoords } = action.payload;
      const updatedBarriers = state.current.barriers.map(barrier => {
        // Сравниваем барьеры по их строковому представлению координат,
        // так как ID генерируется из них в MapCore.
        if (JSON.stringify(barrier) === JSON.stringify(oldCoords)) {
          return newCoords;
        }
        return barrier;
      });
      return mapHistoryReducer(state, { type: 'UPDATE_STATE', payload: { barriers: updatedBarriers } });
    }
    default:
      return state;
  }
};

// Начальное состояние для редьюсера
const initialMapHistoryState: MapHistoryState = {
  current: defaultMapState,
  history: [defaultMapState],
  historyIndex: 0,
};

// Интерфейс для функций действий, доступных через контекст
interface MapActions {
  setMapImageSrc: (src: string | null) => void;
  setMapDimensions: (width: number, height: number) => void;
  setBeacons: (beacons: Beacon[]) => void;
  setAntennas: (antennas: Antenna[]) => void;
  setBarriers: (barriers: Coordinate[][][]) => void;
  setZones: (zones: Zone[]) => void;
  setSwitches: (switches: Switch[]) => void;
  setCableDucts: (cableDucts: CableDuct[]) => void;
  setBeaconPrice: (price: number) => void;
  setAntennaPrice: (price: number) => void;
  setCablePricePerMeter: (price: number) => void;
  toggleShowBeacons: () => void;
  toggleShowAntennas: () => void;
  toggleShowBarriers: () => void;
  toggleShowAntennaRanges: () => void;
  toggleShowZones: () => void;
  toggleShowSwitches: () => void;
  toggleShowCableDucts: () => void;
  toggleShowCableDuctLengths: () => void;
  resetMapData: () => void;
  loadMapConfiguration: (config: SavedMapConfig) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  deleteCableDuctSegment: (id: string, segmentIndex: number) => void;
  updateBarrier: (oldCoords: Coordinate[][][], newCoords: Coordinate[][][]) => void; // Добавлен новый метод
}

const MapContext = createContext<{ state: MapState; actions: MapActions } | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [historyState, dispatch] = useReducer(mapHistoryReducer, initialMapHistoryState);

  const actions: MapActions = useMemo(() => ({
    setMapImageSrc: (src) => dispatch({ type: 'UPDATE_STATE', payload: { mapImageSrc: src } }),
    setMapDimensions: (width, height) => dispatch({ type: 'UPDATE_STATE', payload: { mapWidthMeters: width, mapHeightMeters: height } }),
    setBeacons: (beacons) => dispatch({ type: 'UPDATE_STATE', payload: { beacons } }),
    setAntennas: (antennas) => dispatch({ type: 'UPDATE_STATE', payload: { antennas } }),
    setBarriers: (barriers) => dispatch({ type: 'UPDATE_STATE', payload: { barriers } }),
    setZones: (zones) => dispatch({ type: 'UPDATE_STATE', payload: { zones } }),
    setSwitches: (switches) => dispatch({ type: 'UPDATE_STATE', payload: { switches } }),
    setCableDucts: (cableDucts) => dispatch({ type: 'UPDATE_STATE', payload: { cableDucts } }),
    setBeaconPrice: (price) => dispatch({ type: 'UPDATE_STATE', payload: { beaconPrice: price } }),
    setAntennaPrice: (price) => dispatch({ type: 'UPDATE_STATE', payload: { antennaPrice: price } }),
    setCablePricePerMeter: (price) => dispatch({ type: 'UPDATE_STATE', payload: { cablePricePerMeter: price } }),
    toggleShowBeacons: () => dispatch({ type: 'UPDATE_STATE', payload: { showBeacons: !historyState.current.showBeacons } }),
    toggleShowAntennas: () => dispatch({ type: 'UPDATE_STATE', payload: { showAntennas: !historyState.current.showAntennas } }),
    toggleShowBarriers: () => dispatch({ type: 'UPDATE_STATE', payload: { showBarriers: !historyState.current.showBarriers } }),
    toggleShowAntennaRanges: () => dispatch({ type: 'UPDATE_STATE', payload: { showAntennaRanges: !historyState.current.showAntennaRanges } }),
    toggleShowZones: () => dispatch({ type: 'UPDATE_STATE', payload: { showZones: !historyState.current.showZones } }),
    toggleShowSwitches: () => dispatch({ type: 'UPDATE_STATE', payload: { showSwitches: !historyState.current.showSwitches } }),
    toggleShowCableDucts: () => dispatch({ type: 'UPDATE_STATE', payload: { showCableDucts: !historyState.current.showCableDucts } }),
    toggleShowCableDuctLengths: () => dispatch({ type: 'UPDATE_STATE', payload: { showCableDuctLengths: !historyState.current.showCableDuctLengths } }),
    resetMapData: () => dispatch({ type: 'RESET_MAP_DATA' }),
    loadMapConfiguration: (config) => dispatch({ type: 'LOAD_CONFIGURATION', payload: config }),
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    canUndo: historyState.historyIndex > 0,
    canRedo: historyState.historyIndex < historyState.history.length - 1,
    deleteCableDuctSegment: (id, segmentIndex) => dispatch({ type: 'DELETE_CABLE_DUCT_SEGMENT', payload: { id, segmentIndex } }),
    updateBarrier: (oldCoords, newCoords) => dispatch({ type: 'UPDATE_BARRIER', payload: { oldCoords, newCoords } }), // Добавлен новый метод
  }), [historyState]);

  return (
    <MapContext.Provider value={{ state: historyState.current, actions }}>
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