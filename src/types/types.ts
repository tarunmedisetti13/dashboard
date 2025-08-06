// types.ts

export type ThresholdRule = {
  operator: '=' | '<' | '>' | '<=' | '>=';
  value: number;
  color: string;
};
export interface PolygonConfig {
  label?: string;
  threshold?: number;
  tag?: string[];
  averageTemperature?: number;
  dataSource?: string;      // ✅ Add this
  field?: string;           // ✅ Add this too (used with dataSource)
}


export interface SidebarProps {
  polygonConfigs: Record<string, PolygonConfig>;
  onConfigChange: (id: string, config: PolygonConfig) => void;
  setView: (view: 'mapview' | 'dashboard' | 'settings') => void;
}
// types.ts
export interface DataSourceConfig {
  dataSource: string;
  field: string;
  thresholdLow: number;
  thresholdHigh: number;
  colorLow: string;
  colorHigh: string;
}
