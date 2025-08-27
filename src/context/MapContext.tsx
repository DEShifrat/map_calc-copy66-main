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

export interface Zone {
  id: string;
  polygon: Coordinate[][];
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

// НОВАЯ СУЩНОСТЬ: Зональная антенна
interface ZoneAntenna {
  id: string;
  position: Coordinate;
  price?: number;
}

// Интерфейс для состояния карты
interface MapState {
  mapImageSrc: string | null;
  mapWidthMeters: number;
  mapHeightMeters: number;
  beacons: Beacon[];
  antennas: Antenna[];
  barriers: Coordinate[][][];
  zones: Zone[];
  switches: Switch[];
  cableDucts: CableDuct[];
  zoneAntennas: ZoneAntenna[]; // Добавлено
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
  showZoneAntennas: boolean; // Добавлено
  // Auto-save settings
  isAutoSaveEnabled: boolean;
  autoSaveIntervalMinutes: number;
}

// Интерфейс для сохраненной конфигурации
interface SavedMapConfig {
  mapImageSrc: string;
  mapWidthMeters: number;
  mapHeightMeters: number;
  beacons: Beacon[];
  antennas: Antenna[];
  barriers: Coordinate[][][];
  zones: Zone[];
  switches: Switch[];
  cableDucts: CableDuct[];
  zoneAntennas: ZoneAntenna[]; // Добавлено
  cablePricePerMeter?: number;
  defaultBeaconPrice?: number;
  defaultAntennaPrice?: number;
}

// Интерфейс для сохраненных настроек (для localStorage)
interface SavedPreferences {
  isAutoSaveEnabled: boolean;
  autoSaveIntervalMinutes: number;
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
  | { type: 'UPDATE_BARRIER'; payload: { oldBarrierId: string; newCoords: Coordinate[][] } };

const MAX_HISTORY_SIZE = 20; // Максимальное количество состояний в истории
const LOCAL_STORAGE_KEY = 'mapManagerConfig'; // Ключ для localStorage
const PREFERENCES_LOCAL_STORAGE_KEY = 'mapManagerPreferences'; // Ключ для настроек в localStorage

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
  zoneAntennas: [], // Инициализация
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
  showZoneAntennas: true, // Инициализация
  isAutoSaveEnabled: true, // Default to ON
  autoSaveIntervalMinutes: 5, // Default to 5 minutes
};

// Функция для загрузки состояния из localStorage
const loadStateFromLocalStorage = (): MapState => {
  try {
    const serializedConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
    const serializedPreferences = localStorage.getItem(PREFERENCES_LOCAL_STORAGE_KEY);

    let loadedConfig: SavedMapConfig | null = null;
    if (serializedConfig) {
      loadedConfig = JSON.parse(serializedConfig);
    }

    let loadedPreferences: SavedPreferences | null = null;
    if (serializedPreferences) {
      loadedPreferences = JSON.parse(serializedPreferences);
    }

    return {
      ...defaultMapState, // Начинаем с дефолтного состояния, чтобы убедиться, что все свойства присутствуют
      ...(loadedConfig ? {
        mapImageSrc: loadedConfig.mapImageSrc,
        mapWidthMeters: loadedConfig.mapWidthMeters,
        mapHeightMeters: loadedConfig.mapHeightMeters,
        beacons: loadedConfig.beacons || [],
        antennas: loadedConfig.antennas || [],
        barriers: loadedConfig.barriers || [],
        zones: loadedConfig.zones || [],
        switches: loadedConfig.switches || [],
        cableDucts: loadedConfig.cableDucts?.map(duct => ({ ...duct, type: duct.type || 'main' })) || [],
        zoneAntennas: loadedConfig.zoneAntennas || [], // Загрузка зональных антенн
        cablePricePerMeter: loadedConfig.cablePricePerMeter ?? 1,
        beaconPrice: loadedConfig.defaultBeaconPrice ?? 10,
        antennaPrice: loadedConfig.defaultAntennaPrice ?? 50,
      } : {}),
      ...(loadedPreferences ? {
        isAutoSaveEnabled: loadedPreferences.isAutoSaveEnabled,
        autoSaveIntervalMinutes: loadedPreferences.autoSaveIntervalMinutes,
      } : {}),
    };
  } catch (error) {
    console.error("Ошибка при загрузке состояния из localStorage:", error);
    return defaultMapState;
  }
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
      // При сбросе данных карты, сохраняем настройки автосохранения
      const resetState = {
        ...defaultMapState,
        isAutoSaveEnabled: state.current.isAutoSaveEnabled,
        autoSaveIntervalMinutes: state.current.autoSaveIntervalMinutes,
      };
      return {
        current: resetState,
        history: [resetState],
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
        zoneAntennas: config.zoneAntennas || [], // Загрузка зональных антенн
        cablePricePerMeter: config.cablePricePerMeter ?? 1,
        beaconPrice: config.defaultBeaconPrice ?? 10,
        antennaPrice: config.defaultAntennaPrice ?? 50,
        // Сохраняем текущие состояния видимости слоев и настроек автосохранения
        showBeacons: state.current.showBeacons,
        showAntennas: state.current.showAntennas,
        showBarriers: state.current.showBarriers,
        showAntennaRanges: state.current.showAntennaRanges,
        showZones: state.current.showZones,
        showSwitches: state.current.showSwitches,
        showCableDucts: state.current.showCableDucts,
        showCableDuctLengths: state.current.showCableDuctLengths,
        showZoneAntennas: state.current.showZoneAntennas, // Сохраняем состояние видимости
        isAutoSaveEnabled: state.current.isAutoSaveEnabled,
        autoSaveIntervalMinutes: state.current.autoSaveIntervalMinutes,
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
      const { oldBarrierId, newCoords } = action.payload; // Изменено: oldCoords теперь oldBarrierId
      const updatedBarriers = state.current.barriers.map(barrier => {
        // Сравниваем барьеры по их строковому представлению координат,
        // так как ID генерируется из них в MapCore.
        if (JSON.stringify(barrier) === oldBarrierId) { // Сравниваем с oldBarrierId
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

// Начальное состояние для редьюсера, загружаемое из localStorage
const initialMapHistoryState: MapHistoryState = {
  current: loadStateFromLocalStorage(),
  history: [loadStateFromLocalStorage()],
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
  setZoneAntennas: (zoneAntennas: ZoneAntenna[]) => void; // Добавлено
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
  toggleShowZoneAntennas: () => void; // Добавлено
  resetMapData: () => void;
  loadMapConfiguration: (config: SavedMapConfig) => void;
  saveMapConfigurationToLocalStorage: () => void; // Новое действие для сохранения в localStorage
  savePreferencesToLocalStorage: () => void; // Новое действие для сохранения настроек в localStorage
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  deleteCableDuctSegment: (id: string, segmentIndex: number) => void;
  updateBarrier: (oldBarrierId: string, newCoords: Coordinate[][]) => void;
  toggleAutoSave: () => void;
  setAutoSaveInterval: (interval: number) => void;
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
    setZoneAntennas: (zoneAntennas) => dispatch({ type: 'UPDATE_STATE', payload: { zoneAntennas } }), // Добавлено
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
    toggleShowZoneAntennas: () => dispatch({ type: 'UPDATE_STATE', payload: { showZoneAntennas: !historyState.current.showZoneAntennas } }), // Добавлено
    resetMapData: () => dispatch({ type: 'RESET_MAP_DATA' }),
    loadMapConfiguration: (config) => dispatch({ type: 'LOAD_CONFIGURATION', payload: config }),
    saveMapConfigurationToLocalStorage: () => {
      try {
        const configToSave: SavedMapConfig = {
          mapImageSrc: historyState.current.mapImageSrc || '', // Ensure non-null for saving
          mapWidthMeters: historyState.current.mapWidthMeters,
          mapHeightMeters: historyState.current.mapHeightMeters,
          beacons: historyState.current.beacons,
          antennas: historyState.current.antennas,
          barriers: historyState.current.barriers,
          zones: historyState.current.zones,
          switches: historyState.current.switches,
          cableDucts: historyState.current.cableDucts,
          zoneAntennas: historyState.current.zoneAntennas, // Сохранение зональных антенн
          cablePricePerMeter: historyState.current.cablePricePerMeter,
          defaultBeaconPrice: historyState.current.beaconPrice,
          defaultAntennaPrice: historyState.current.antennaPrice,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configToSave));
        console.log('Конфигурация карты автоматически сохранена в localStorage.');
      } catch (error) {
        console.error('Ошибка при автоматическом сохранении в localStorage:', error);
        // Можно добавить showWarning или showError здесь, но для автосохранения лучше быть менее навязчивым
      }
    },
    savePreferencesToLocalStorage: () => {
      try {
        const preferencesToSave: SavedPreferences = {
          isAutoSaveEnabled: historyState.current.isAutoSaveEnabled,
          autoSaveIntervalMinutes: historyState.current.autoSaveIntervalMinutes,
        };
        localStorage.setItem(PREFERENCES_LOCAL_STORAGE_KEY, JSON.stringify(preferencesToSave));
        console.log('Настройки автосохранения сохранены в localStorage.');
      } catch (error) {
        console.error('Ошибка при сохранении настроек автосохранения в localStorage:', error);
      }
    },
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    canUndo: historyState.historyIndex > 0,
    canRedo: historyState.historyIndex < historyState.history.length - 1,
    deleteCableDuctSegment: (id, segmentIndex) => dispatch({ type: 'DELETE_CABLE_DUCT_SEGMENT', payload: { id, segmentIndex } }),
    updateBarrier: (oldBarrierId, newCoords) => dispatch({ type: 'UPDATE_BARRIER', payload: { oldBarrierId, newCoords } }),
    toggleAutoSave: () => dispatch({ type: 'UPDATE_STATE', payload: { isAutoSaveEnabled: !historyState.current.isAutoSaveEnabled } }),
    setAutoSaveInterval: (interval) => dispatch({ type: 'UPDATE_STATE', payload: { autoSaveIntervalMinutes: interval } }),
  }), [historyState]);

  // Эффект для сохранения настроек автосохранения при их изменении
  React.useEffect(() => {
    actions.savePreferencesToLocalStorage();
  }, [historyState.current.isAutoSaveEnabled, historyState.current.autoSaveIntervalMinutes, actions]);

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