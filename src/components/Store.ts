// src/store.ts
import { create } from 'zustand';

// Operator for threshold comparison
export type ThresholdRule = {
    operator: '<' | '<=' | '>' | '>=' | '=';
    value: number;
};

// Polygon configuration structure
export type PolygonConfig = {
    id: string;
    coordinates: [number, number][]; // MapLibre: [lng, lat]
    dataSource: string; // e.g., 'temperature_2m'
    rule: ThresholdRule;
    color: string;
};

// Weather data cache per polygon
export type WeatherDataCache = {
    [polygonId: string]: {
        [timestamp: string]: number; // e.g., { '2025-08-05T10:00': 32.1 }
    };
};

// Zustand store interface
interface DashboardState {
    polygons: { [id: string]: PolygonConfig };
    addPolygon: (config: PolygonConfig) => void;
    updatePolygon: (id: string, updates: Partial<PolygonConfig>) => void;
    deletePolygon: (id: string) => void;

    selectedTimeRange: [string, string];
    setSelectedTimeRange: (range: [string, string]) => void;

    weatherData: WeatherDataCache;
    setWeatherData: (polygonId: string, data: { [timestamp: string]: number }) => void;
}

// Zustand store implementation
export const useDashboardStore = create<DashboardState>((set) => ({
    polygons: {},
    addPolygon: (config) =>
        set((state) => ({ polygons: { ...state.polygons, [config.id]: config } })),

    updatePolygon: (id, updates) =>
        set((state) => ({
            polygons: {
                ...state.polygons,
                [id]: { ...state.polygons[id], ...updates },
            },
        })),

    deletePolygon: (id) =>
        set((state) => {
            const newPolygons = { ...state.polygons };
            delete newPolygons[id];
            return { polygons: newPolygons };
        }),

    selectedTimeRange: [new Date().toISOString(), new Date().toISOString()],
    setSelectedTimeRange: (range) => set(() => ({ selectedTimeRange: range })),

    weatherData: {},
    setWeatherData: (polygonId, data) =>
        set((state) => ({
            weatherData: {
                ...state.weatherData,
                [polygonId]: { ...state.weatherData[polygonId], ...data },
            },
        })),
}));
