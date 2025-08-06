import { useState, useCallback } from 'react';
import MapView from './components/MapView';
import TimelineSlider from './components/TimelineSlider';
import type { PolygonConfig } from './types/types';
import DataSourceSidebar from './components/Sidebar';

// Define view types
type ViewType = 'mapview' | 'dashboard' | 'settings';

// Define mode type to match TimelineSlider
type Mode = 'single' | 'range';

function App() {
  const [view] = useState<ViewType>('mapview');

  // Polygon configurations - each polygon can have its own data source and thresholds
  const [configByPolygon, setConfigByPolygon] = useState<Record<string, PolygonConfig>>({});



  // Used to trigger loading state when polygons are being updated
  const [isUpdatingPolygons, setIsUpdatingPolygons] = useState(false);

  // Updates polygon config when changes happen from the sidebar
  const handleConfigChange = useCallback((id: string, newConfig: PolygonConfig) => {
    setConfigByPolygon((prev) => {
      const currentConfig = prev[id];
      if (currentConfig && JSON.stringify(currentConfig) === JSON.stringify(newConfig)) {
        return prev; // No change
      }
      return {
        ...prev,
        [id]: {
          ...prev[id],
          ...newConfig,
        },
      };
    });
  }, []);

  // Change current view (mapview/dashboard/settings)
  // const handleViewChange = useCallback((newView: ViewType) => {
  //   setView(newView);
  // }, []);

  // Called when the user adjusts the timeline slider
  const handleTimeChange = useCallback((startTime: Date, endTime: Date, mode: Mode) => {
    setTimelineState(prevState => {
      if (
        prevState.startTime.getTime() === startTime.getTime() &&
        prevState.endTime.getTime() === endTime.getTime() &&
        prevState.mode === mode
      ) {
        return prevState; // Avoid re-render if no changes
      }
      return { startTime, endTime, mode };
    });
    setIsUpdatingPolygons(true);
  }, []);
  // Timeline state - this drives the temporal data for all polygons
  const [, setTimelineState] = useState<{
    startTime: Date;
    endTime: Date;
    mode: Mode;
  }>(() => ({
    startTime: new Date(),
    endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
    mode: 'single'
  }));
  // ❌ Currently unused, comment out until needed
  /*
  const handlePolygonDelete = useCallback((polygonId: string) => {
    setConfigByPolygon((prev) => {
      if (!prev[polygonId]) return prev;
      const newConfig = { ...prev };
      delete newConfig[polygonId];
      return newConfig;
    });
  }, []);
  */

  // ✅ Ends polygon update loading state
  // const handlePolygonUpdateComplete = useCallback(() => {
  //   setIsUpdatingPolygons(false);
  // }, []);

  // ❌ Currently unused summary stats (not shown in JSX), comment to silence warning
  /*
  const polygonStats = useMemo(() => {
    const polygonEntries = Object.entries(configByPolygon);
    return {
      totalPolygons: polygonEntries.length,
      configuredPolygons: polygonEntries.filter(([_, config]) =>
        config.label && config.dataSource
      ).length,
      polygonsWithThresholds: polygonEntries.filter(([_, config]) =>
        config.threshold !== undefined
      ).length,
      polygonEntries
    };
  }, [configByPolygon]);
  */

  return (
    <div className="flex h-screen bg-gray-100">
      <DataSourceSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto bg-gray-50">

          {view === 'mapview' && (
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4">
                <MapView
                  configByPolygon={configByPolygon}
                  onConfigChange={handleConfigChange}
                />
              </div>
              <div className="bg-white border-t border-gray-200">
                <TimelineSlider
                  onTimeChange={handleTimeChange}
                  isLoading={isUpdatingPolygons}
                />
              </div>
            </div>
          )}

          {/* Dashboard and Settings views (placeholders for now) */}
          {view === 'dashboard' && (
            <div>Dashboard content...</div>
          )}

          {view === 'settings' && (
            <div>Settings content...</div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;
