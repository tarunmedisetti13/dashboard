import { useRef, useEffect, useState } from 'react'; // ✅ Correct Hook imports
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { PolygonConfig } from '../types/types';
import maplibregl from 'maplibre-gl';
// Import required CSS for map and draw tools
import 'maplibre-gl/dist/maplibre-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import type { ThresholdRule } from '../types/types'; // adjust path if needed

type MapViewProps = {
    configByPolygon: { [id: string]: PolygonConfig };
    onConfigChange: (id: string, config: PolygonConfig) => void;
    // other props if needed
};

//getting temperature coordinates
const getTemperatureForCoordinate = async (lat: number, lon: number): Promise<number | null> => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&timezone=auto`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        const temps = data?.hourly?.temperature_2m;

        if (Array.isArray(temps) && temps.length > 0) {
            // Use the latest available hour's temperature
            return temps[0]; // or temps.at(-1)
        }
    } catch (err) {
        console.error(`Failed to fetch temp for (${lat}, ${lon})`, err);
    }

    return null;
};

// MapView.tsx (inside the component or outside if you prefer)
function getPolygonColor(weatherData: number[] | undefined, thresholds: ThresholdRule[]): string {
    if (!weatherData || weatherData.length === 0) return '#cccccc'; // default gray

    const avg = weatherData.reduce((a, b) => a + b, 0) / weatherData.length;

    for (const rule of thresholds) {
        switch (rule.operator) {
            case '>':
                if (avg > rule.value) return rule.color;
                break;
            case '<':
                if (avg < rule.value) return rule.color;
                break;
            case '>=':
                if (avg >= rule.value) return rule.color;
                break;
            case '<=':
                if (avg <= rule.value) return rule.color;
                break;
            case '=':
                if (avg === rule.value) return rule.color;
                break;
        }
    }

    return '#cccccc'; // fallback color
}

//calculating centroid of apolygon
function calculateCentroid(coords: [number, number][]): [number, number] {
    let x = 0, y = 0;
    coords.slice(0, -1).forEach(([lng, lat]) => {
        x += lng;
        y += lat;
    });
    const count = coords.length - 1; // exclude closing point
    return [x / count, y / count];
}

const MapView: React.FC<MapViewProps> = ({ configByPolygon, onConfigChange }) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const drawRef = useRef<MapboxDraw | null>(null);

    const [polygonAvgTemp, setPolygonAvgTemp] = useState<number | null>(null);
    const [polygonCentroid, setPolygonCentroid] = useState<[number, number] | null>(null);
    const polygonTempMarkersRef = useRef<{ [id: string]: maplibregl.Marker }>({});
    const defaultCenter: [number, number] = [78.9629, 20.5937]; // Longitude, Latitude (India)
    const [polygonData, setPolygonData] = useState<{
        [id: string]: { avgTemp: number; centroid: [number, number] };
    }>({});

    // ✅ Function to get color based on temperature
    const getTemperatureColor = (avgTemp: number): string => {
        if (avgTemp < 10) return '#ff0000';      // Red for < 10°C
        if (avgTemp >= 10 && avgTemp < 25) return '#0000ff';  // Blue for 10-24°C
        return '#00ff00';  // Green for >= 25°C
    };

    // ✅ Fixed function - now receives mapRef as parameter
    const renderPolygonToMap = (id: string, coordinates: number[][], color: string) => {
        if (!mapRef.current) return;

        // Remove any existing layers first (order matters: layers before sources)
        if (mapRef.current.getLayer(`layer-${id}`)) {
            mapRef.current.removeLayer(`layer-${id}`);
        }
        if (mapRef.current.getLayer(`layer-${id}-outline`)) {
            mapRef.current.removeLayer(`layer-${id}-outline`);
        }

        // Now remove the source
        if (mapRef.current.getSource(`source-${id}`)) {
            mapRef.current.removeSource(`source-${id}`);
        }

        // Add the source
        mapRef.current.addSource(`source-${id}`, {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [coordinates], // ✅ Wrap in an extra array
                },
                properties: {}, // ✅ Required by GeoJSON
            },
        });

        // Add fill layer
        mapRef.current.addLayer({
            id: `layer-${id}`,
            type: 'fill',
            source: `source-${id}`,
            paint: {
                'fill-color': color,
                'fill-opacity': 0.6,
            },
        });

        // Add outline layer for better visibility
        mapRef.current.addLayer({
            id: `layer-${id}-outline`,
            type: 'line',
            source: `source-${id}`,
            paint: {
                'line-color': '#000000',
                'line-width': 2,
                'line-opacity': 0.8,
            },
        });
    };

    //handle polygon draw
    const handlePolygonDraw = async (coordinates: [number, number][], polygonId: string) => {
        const uniqueCoords = coordinates.slice(0, -1); // Remove repeated last point

        const temperatures: number[] = [];

        for (const [lng, lat] of uniqueCoords) {
            const temp = await getTemperatureForCoordinate(lat, lng);
            if (temp !== null) {
                temperatures.push(temp);
            }
        }

        if (temperatures.length > 0) {
            const avgTemp =
                temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;

            console.log(`🌡️ Average temperature for polygon: ${avgTemp.toFixed(2)}°C`);
            setPolygonAvgTemp(avgTemp);

            const centroid = calculateCentroid(coordinates);
            setPolygonCentroid(centroid);

            // ✅ Get color based on temperature and render polygon
            const polygonColor = getTemperatureColor(avgTemp);
            renderPolygonToMap(polygonId, coordinates, polygonColor);

            // Display marker at centroid with enhanced styling
            if (centroid && mapRef.current) {
                const popup = document.createElement('div');
                popup.className =
                    'bg-white text-sm px-3 py-2 border-2 border-gray-800 rounded-lg shadow-lg font-semibold';
                popup.style.backgroundColor = 'white';
                popup.style.color = polygonColor;
                popup.style.borderColor = `2px solid ${polygonColor || '#999'}`;
                popup.innerText = `Avg Temp: ${avgTemp.toFixed(2)}°C`;

                // Remove old marker if it exists
                if (polygonTempMarkersRef.current[polygonId]) {
                    polygonTempMarkersRef.current[polygonId].remove();
                    delete polygonTempMarkersRef.current[polygonId];
                }

                // Create and add marker
                const marker = new maplibregl.Marker({ element: popup })
                    .setLngLat([centroid[0], centroid[1]])
                    .addTo(mapRef.current);
                polygonTempMarkersRef.current[polygonId] = marker;
            }

            // ✅ Store polygon data for future reference
            setPolygonData(prev => ({
                ...prev,
                [polygonId]: { avgTemp, centroid }
            }));

        } else {
            setPolygonAvgTemp(null);
            setPolygonCentroid(null);
            console.warn('No temperatures retrieved for polygon');
        }
    };

    useEffect(() => {
        console.log("Updated Polygon Config:", configByPolygon);
    }, [configByPolygon]);

    // Utility to calculate centroid of polygon
    function getPolygonCentroid(coords: [number, number][]): { lat: number, lon: number } {
        let x = 0, y = 0;
        const len = coords.length;

        for (let i = 0; i < len; i++) {
            x += coords[i][0];
            y += coords[i][1];
        }

        return {
            lon: x / len,
            lat: y / len,
        };
    }

    useEffect(() => {
        if (!mapContainer.current) return;

        const map = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://api.maptiler.com/maps/basic-v2/style.json?key=WknalxXowQZdwvFvqTD7',
            center: defaultCenter,
            zoom: 12,            // Locked zoom
            minZoom: 12,
            maxZoom: 12,
            dragRotate: false,
            scrollZoom: false,
            doubleClickZoom: false,
            touchZoomRotate: false,
        });

        mapRef.current = map;

        // ✅ Fixed: Patch Draw to work with MapLibre and handle dasharray issue
        // @ts-ignore
        MapboxDraw.constants.classes.CONTROL_BASE = 'maplibregl-ctrl';

        const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                polygon: true,
                trash: true,
            },
            // ✅ Override default styles to fix dasharray issue
            styles: [
                // Polygon fill
                {
                    id: 'gl-draw-polygon-fill-inactive',
                    type: 'fill',
                    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
                    paint: {
                        'fill-color': '#3bb2d0',
                        'fill-outline-color': '#3bb2d0',
                        'fill-opacity': 0.1
                    }
                },
                // Polygon stroke
                {
                    id: 'gl-draw-polygon-stroke-inactive',
                    type: 'line',
                    filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
                    layout: {
                        'line-cap': 'round',
                        'line-join': 'round'
                    },
                    paint: {
                        'line-color': '#3bb2d0',
                        'line-width': 2
                    }
                },
                // Active polygon fill
                {
                    id: 'gl-draw-polygon-fill-active',
                    type: 'fill',
                    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
                    paint: {
                        'fill-color': '#fbb03b',
                        'fill-outline-color': '#fbb03b',
                        'fill-opacity': 0.1
                    }
                },
                // Active polygon stroke
                {
                    id: 'gl-draw-polygon-stroke-active',
                    type: 'line',
                    filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
                    layout: {
                        'line-cap': 'round',
                        'line-join': 'round'
                    },
                    paint: {
                        'line-color': '#fbb03b',
                        'line-width': 2
                    }
                },
                // Vertex points
                {
                    id: 'gl-draw-polygon-and-line-vertex-halo-active',
                    type: 'circle',
                    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
                    paint: {
                        'circle-radius': 5,
                        'circle-color': '#FFF'
                    }
                },
                {
                    id: 'gl-draw-polygon-and-line-vertex-active',
                    type: 'circle',
                    filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point'], ['!=', 'mode', 'static']],
                    paint: {
                        'circle-radius': 3,
                        'circle-color': '#fbb03b',
                    }
                }
            ]
        });

        drawRef.current = draw;
        map.addControl(draw as unknown as maplibregl.IControl, 'top-left');

        //step 3:
        map.on("draw.create", async (e) => {
            const polygon = e.features[0];
            const id = polygon.id?.toString();
            const geometry = polygon.geometry;

            if (geometry.type !== 'Polygon') {
                console.error('Feature is not a Polygon');
                return;
            }

            const coordinates: [number, number][] = polygon.geometry.coordinates[0];

            if (id) handlePolygonDraw(coordinates, id);
        });

        //Updating polygon temperature when it is dragged
        map.on("draw.update", (e: { features: GeoJSON.Feature[] }) => {
            e.features.forEach((feature) => {
                if (feature.geometry.type === "Polygon") {
                    const coordinates = feature.geometry.coordinates[0] as [number, number][];
                    const id = feature.id?.toString();
                    if (id) {
                        handlePolygonDraw(coordinates, id);
                    }
                }
            });
        });

        map.on("draw.delete", (e: { features: GeoJSON.Feature[] }) => {
            e.features.forEach((feature) => {
                const id = feature.id?.toString();
                if (id) {
                    // Remove temperature marker
                    if (polygonTempMarkersRef.current[id]) {
                        polygonTempMarkersRef.current[id].remove();
                        delete polygonTempMarkersRef.current[id];
                    }

                    // Remove polygon fill layer
                    if (mapRef.current?.getLayer(`layer-${id}`)) {
                        mapRef.current.removeLayer(`layer-${id}`);
                    }
                    // Remove polygon outline layer
                    if (mapRef.current?.getLayer(`layer-${id}-outline`)) {
                        mapRef.current.removeLayer(`layer-${id}-outline`);
                    }
                    // Remove polygon source
                    if (mapRef.current?.getSource(`source-${id}`)) {
                        mapRef.current.removeSource(`source-${id}`);
                    }

                    // Remove from polygon data
                    setPolygonData(prev => {
                        const newData = { ...prev };
                        delete newData[id];
                        return newData;
                    });
                }
            });
        });

        //step 3 end
        return () => map.remove();
    }, []);

    const handleResetCenter = () => {
        mapRef.current?.flyTo({ center: defaultCenter, essential: true });
    };

    return (
        <div style={{ padding: '20px' }}>
            <div
                ref={mapContainer}
                style={{
                    width: '100%',
                    height: '500px',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                }}
            />
            <button
                onClick={handleResetCenter}
                style={{
                    marginTop: '12px',
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginRight: '10px',
                }}
            >
                Reset Center
            </button>

            {/* ✅ Temperature Legend */}
            <div style={{
                display: 'inline-block',
                backgroundColor: 'white',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                marginLeft: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
                    Temperature Legend
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '20px',
                            height: '15px',
                            backgroundColor: '#ff0000',
                            border: '1px solid #000'
                        }}></div>
                        <span>&lt; 10°C (Cold)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '20px',
                            height: '15px',
                            backgroundColor: '#0000ff',
                            border: '1px solid #000'
                        }}></div>
                        <span>10-24°C (Moderate)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '20px',
                            height: '15px',
                            backgroundColor: '#00ff00',
                            border: '1px solid #000'
                        }}></div>
                        <span>≥ 25°C (Hot)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapView;