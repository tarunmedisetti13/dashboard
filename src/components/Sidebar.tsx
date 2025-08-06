import { useState, useCallback } from 'react';
import { Plus, Trash2, Settings, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';

// Types for data sources and thresholds
interface ThresholdRule {
    id: string;
    operator: '=' | '<' | '>' | '<=' | '>=';
    value: number;
    color: string;
    label?: string;
}

interface DataSource {
    id: string;
    name: string;
    provider: string;
    fields: string[];
    selectedField: string;
    thresholds: ThresholdRule[];
    isActive: boolean;
    polygonId?: string;
}

interface Polygon {
    id: string;
    name: string;
    dataSourceId?: string;
}

// Mock data for available data sources
const AVAILABLE_DATA_SOURCES = {
    'open-meteo': {
        name: 'Open-Meteo Weather',
        provider: 'Open-Meteo',
        fields: [
            'temperature_2m',
            'relative_humidity_2m',
            'precipitation',
            'wind_speed_10m',
            'wind_direction_10m',
            'pressure_msl',
            'cloud_cover',
            'visibility'
        ]
    },
    'air-quality': {
        name: 'Air Quality Index',
        provider: 'OpenWeatherMap',
        fields: [
            'pm2_5',
            'pm10',
            'co',
            'no2',
            'so2',
            'o3',
            'aqi'
        ]
    },
    'satellite': {
        name: 'Satellite Data',
        provider: 'NASA',
        fields: [
            'ndvi',
            'lst',
            'precipitation_accumulated',
            'soil_moisture'
        ]
    }
};

const PRESET_COLORS = [
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#808080', '#000000'
];

const DataSourceSidebar: React.FC = () => {
    const [dataSources, setDataSources] = useState<DataSource[]>([
        {
            id: 'default-open-meteo',
            name: 'Open-Meteo Weather',
            provider: 'Open-Meteo',
            fields: AVAILABLE_DATA_SOURCES['open-meteo'].fields,
            selectedField: 'temperature_2m',
            thresholds: [
                { id: '1', operator: '<', value: 10, color: '#FF0000', label: 'Cold' },
                { id: '2', operator: '>=', value: 10, color: '#0000FF', label: 'Moderate' },
                { id: '3', operator: '>=', value: 25, color: '#00FF00', label: 'Warm' }
            ],
            isActive: true
        }
    ]);

    const [polygons] = useState<Polygon[]>([
        { id: 'poly-1', name: 'Polygon 1' },
        { id: 'poly-2', name: 'Polygon 2' },
        { id: 'poly-3', name: 'Polygon 3' }
    ]);

    const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set(['default-open-meteo']));
    const [showAddDataSource, setShowAddDataSource] = useState(false);

    const toggleSourceExpansion = (sourceId: string) => {
        setExpandedSources(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sourceId)) {
                newSet.delete(sourceId);
            } else {
                newSet.add(sourceId);
            }
            return newSet;
        });
    };

    const addDataSource = (sourceKey: string) => {
        const sourceTemplate = AVAILABLE_DATA_SOURCES[sourceKey as keyof typeof AVAILABLE_DATA_SOURCES];
        const newSource: DataSource = {
            id: `${sourceKey}-${Date.now()}`,
            name: sourceTemplate.name,
            provider: sourceTemplate.provider,
            fields: sourceTemplate.fields,
            selectedField: sourceTemplate.fields[0],
            thresholds: [
                { id: '1', operator: '<', value: 50, color: '#FF0000' },
                { id: '2', operator: '>=', value: 50, color: '#00FF00' }
            ],
            isActive: true
        };

        setDataSources(prev => [...prev, newSource]);
        setExpandedSources(prev => new Set([...prev, newSource.id]));
        setShowAddDataSource(false);
    };

    const removeDataSource = (sourceId: string) => {
        setDataSources(prev => prev.filter(ds => ds.id !== sourceId));
        setExpandedSources(prev => {
            const newSet = new Set(prev);
            newSet.delete(sourceId);
            return newSet;
        });
    };

    const updateDataSource = (sourceId: string, updates: Partial<DataSource>) => {
        setDataSources(prev =>
            prev.map(ds => ds.id === sourceId ? { ...ds, ...updates } : ds)
        );
    };

    const addThreshold = (sourceId: string) => {
        const newThreshold: ThresholdRule = {
            id: Date.now().toString(),
            operator: '<',
            value: 0,
            color: '#808080'
        };

        updateDataSource(sourceId, {
            thresholds: [...(dataSources.find(ds => ds.id === sourceId)?.thresholds || []), newThreshold]
        });
    };

    const updateThreshold = (sourceId: string, thresholdId: string, updates: Partial<ThresholdRule>) => {
        const source = dataSources.find(ds => ds.id === sourceId);
        if (!source) return;

        const updatedThresholds = source.thresholds.map(threshold =>
            threshold.id === thresholdId ? { ...threshold, ...updates } : threshold
        );

        updateDataSource(sourceId, { thresholds: updatedThresholds });
    };

    const removeThreshold = (sourceId: string, thresholdId: string) => {
        const source = dataSources.find(ds => ds.id === sourceId);
        if (!source || source.thresholds.length <= 1) return;

        const updatedThresholds = source.thresholds.filter(threshold => threshold.id !== thresholdId);
        updateDataSource(sourceId, { thresholds: updatedThresholds });
    };

    return (
        <div className="w-80 bg-white border-r border-gray-200 h-full overflow-y-auto">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Data Sources</h2>

                <button
                    onClick={() => setShowAddDataSource(!showAddDataSource)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                    <Plus size={16} />
                    Add Data Source
                </button>

                {showAddDataSource && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                        {Object.entries(AVAILABLE_DATA_SOURCES).map(([key, source]) => (
                            <button
                                key={key}
                                onClick={() => addDataSource(key)}
                                className="w-full text-left px-2 py-1 hover:bg-gray-200 rounded text-sm"
                            >
                                <div className="font-medium">{source.name}</div>
                                <div className="text-xs text-gray-500">{source.provider}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Data Sources List */}
            <div className="p-4 space-y-4">
                {dataSources.map((source) => (
                    <div key={source.id} className="border border-gray-200 rounded-lg">
                        {/* Source Header */}
                        <div className="flex items-center justify-between p-3 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleSourceExpansion(source.id)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    {expandedSources.has(source.id) ?
                                        <ChevronDown size={16} /> :
                                        <ChevronRight size={16} />
                                    }
                                </button>
                                <h3 className="font-medium text-gray-800">{source.name}</h3>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => updateDataSource(source.id, { isActive: !source.isActive })}
                                    className={`p-1 rounded ${source.isActive ? 'text-green-600' : 'text-gray-400'}`}
                                >
                                    {source.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>

                                {source.id !== 'default-open-meteo' && (
                                    <button
                                        onClick={() => removeDataSource(source.id)}
                                        className="p-1 text-red-500 hover:text-red-700"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {expandedSources.has(source.id) && (
                            <div className="p-3 space-y-4">
                                {/* Field Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Data Field
                                    </label>
                                    <select
                                        value={source.selectedField}
                                        onChange={(e) => updateDataSource(source.id, { selectedField: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {source.fields.map(field => (
                                            <option key={field} value={field}>
                                                {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Polygon Assignment */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Assign to Polygon
                                    </label>
                                    <select
                                        value={source.polygonId || ''}
                                        onChange={(e) => updateDataSource(source.id, { polygonId: e.target.value || undefined })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">None</option>
                                        {polygons.map(polygon => (
                                            <option key={polygon.id} value={polygon.id}>
                                                {polygon.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Threshold Rules */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700">
                                            Color Thresholds
                                        </label>
                                        <button
                                            onClick={() => addThreshold(source.id)}
                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                        >
                                            <Plus size={12} />
                                            Rule
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {source.thresholds.map((threshold, index) => (
                                            <div key={threshold.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                                <select
                                                    value={threshold.operator}
                                                    onChange={(e) => updateThreshold(source.id, threshold.id, {
                                                        operator: e.target.value as ThresholdRule['operator']
                                                    })}
                                                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                                                >
                                                    <option value="<">{'<'}</option>
                                                    <option value="<=">{'≤'}</option>
                                                    <option value=">">{' >'}</option>
                                                    <option value=">=">{' ≥'}</option>
                                                    <option value="=">{'='}</option>
                                                </select>

                                                <input
                                                    type="number"
                                                    value={threshold.value}
                                                    onChange={(e) => updateThreshold(source.id, threshold.id, {
                                                        value: parseFloat(e.target.value) || 0
                                                    })}
                                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-xs"
                                                />

                                                <input
                                                    type="color"
                                                    value={threshold.color}
                                                    onChange={(e) => updateThreshold(source.id, threshold.id, {
                                                        color: e.target.value
                                                    })}
                                                    className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                                                />

                                                <input
                                                    type="text"
                                                    placeholder="Label"
                                                    value={threshold.label || ''}
                                                    onChange={(e) => updateThreshold(source.id, threshold.id, {
                                                        label: e.target.value
                                                    })}
                                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                                                />

                                                {source.thresholds.length > 1 && (
                                                    <button
                                                        onClick={() => removeThreshold(source.id, threshold.id)}
                                                        className="p-1 text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Color Presets */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Quick Colors
                                    </label>
                                    <div className="flex gap-1 flex-wrap">
                                        {PRESET_COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => {
                                                    const lastThreshold = source.thresholds[source.thresholds.length - 1];
                                                    if (lastThreshold) {
                                                        updateThreshold(source.id, lastThreshold.id, { color });
                                                    }
                                                }}
                                                className="w-6 h-6 rounded border border-gray-300"
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Preview */}
                                <div className="pt-2 border-t border-gray-200">
                                    <div className="text-xs font-medium text-gray-700 mb-1">Preview</div>
                                    <div className="space-y-1">
                                        {source.thresholds.map((threshold, index) => (
                                            <div key={threshold.id} className="flex items-center gap-2 text-xs">
                                                <div
                                                    className="w-3 h-3 rounded"
                                                    style={{ backgroundColor: threshold.color }}
                                                />
                                                <span>
                                                    {threshold.operator} {threshold.value}
                                                    {threshold.label && ` (${threshold.label})`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Summary Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                    <div>Active Sources: {dataSources.filter(ds => ds.isActive).length}</div>
                    <div>Total Rules: {dataSources.reduce((sum, ds) => sum + ds.thresholds.length, 0)}</div>
                </div>
            </div>
        </div>
    );
};

export default DataSourceSidebar;