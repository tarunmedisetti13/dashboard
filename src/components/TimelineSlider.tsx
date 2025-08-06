import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface TimelineDataPoint {
    index: number;
    date: Date;
    label: string;
}

interface TimelineMark {
    index: number;
    label: string;
    isToday: boolean;
}

interface DragState {
    type: 'single' | 'start' | 'end';
    startX: number;
}

type Mode = 'single' | 'range';

interface TimelineSliderProps {
    onTimeChange: (startTime: Date, endTime: Date, mode: Mode) => void;
    isLoading?: boolean;
}

const TimelineSlider: React.FC<TimelineSliderProps> = ({ onTimeChange }) => {
    // Generate 30 days of hourly data (15 days before/after today)
    const generateTimelineData = (): TimelineDataPoint[] => {
        const data: TimelineDataPoint[] = [];
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - 15);
        startDate.setHours(0, 0, 0, 0);

        for (let day = 0; day < 30; day++) {
            for (let hour = 0; hour < 24; hour++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + day);
                date.setHours(hour);
                data.push({
                    index: day * 24 + hour,
                    date: date,
                    label: hour === 0 ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `${hour}:00`
                });
            }
        }
        return data;
    };

    const timelineData: TimelineDataPoint[] = useMemo(() => generateTimelineData(), []);
    const totalHours: number = timelineData.length;
    const todayIndex: number = 15 * 24; // Today at midnight

    // Single handle state (starts at current hour)
    const [singleHandle, setSingleHandle] = useState<number>(todayIndex + new Date().getHours());

    // Range handles state (starts with 24-hour window around current time)
    const [rangeStart, setRangeStart] = useState<number>(todayIndex);
    const [rangeEnd, setRangeEnd] = useState<number>(todayIndex + 24);

    // Active mode
    const [mode, setMode] = useState<Mode>('single');

    // Drag state
    const [dragState, setDragState] = useState<DragState | null>(null);
    const sliderRef = useRef<HTMLDivElement>(null);

    const valueToPercent = (value: number): number => (value / (totalHours - 1)) * 100;
    const percentToValue = (percent: number): number => Math.round((percent / 100) * (totalHours - 1));

    const getMousePosition = useCallback((e: MouseEvent): number => {
        if (!sliderRef.current) return 0;
        const rect = sliderRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        return percentToValue(percent);
    }, []);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, handleType: DragState['type']): void => {
        e.preventDefault();
        setDragState({ type: handleType, startX: e.clientX });
    };

    const handleMouseMove = useCallback((e: MouseEvent): void => {
        if (!dragState) return;

        const newValue = getMousePosition(e);

        if (mode === 'single') {
            setSingleHandle(Math.max(0, Math.min(totalHours - 1, newValue)));
        } else {
            if (dragState.type === 'start') {
                setRangeStart(Math.max(0, Math.min(rangeEnd - 1, newValue)));
            } else if (dragState.type === 'end') {
                setRangeEnd(Math.max(rangeStart + 1, Math.min(totalHours - 1, newValue)));
            }
        }
    }, [dragState, mode, rangeEnd, rangeStart, getMousePosition, totalHours]);

    const handleMouseUp = useCallback((): void => {
        setDragState(null);
    }, []);

    // Add global mouse event listeners
    useEffect(() => {
        if (dragState) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragState, handleMouseMove, handleMouseUp]);

    // Notify parent of time changes
    useEffect(() => {
        let startTime: Date, endTime: Date;

        if (mode === 'single') {
            startTime = timelineData[singleHandle].date;
            endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + 1);
        } else {
            startTime = timelineData[rangeStart].date;
            endTime = timelineData[rangeEnd].date;
        }

        onTimeChange(startTime, endTime, mode);
    }, [singleHandle, rangeStart, rangeEnd, mode, onTimeChange, timelineData]);

    const handleSliderClick = (e: React.MouseEvent<HTMLDivElement>): void => {
        if (dragState) return;
        const newValue = getMousePosition(e.nativeEvent);

        if (mode === 'single') {
            setSingleHandle(newValue);
        } else {
            // Click closer to start or end handle
            const distToStart = Math.abs(newValue - rangeStart);
            const distToEnd = Math.abs(newValue - rangeEnd);

            if (distToStart < distToEnd) {
                setRangeStart(Math.max(0, Math.min(rangeEnd - 1, newValue)));
            } else {
                setRangeEnd(Math.max(rangeStart + 1, Math.min(totalHours - 1, newValue)));
            }
        }
    };

    const formatDateTime = (index: number): string => {
        const data = timelineData[index];
        return data ? `${data.date.toLocaleDateString()} ${data.date.getHours()}:00` : '';
    };

    const generateMarks = (): TimelineMark[] => {
        const marks: TimelineMark[] = [];
        for (let i = 0; i < totalHours; i += 24) { // Show daily marks
            const data = timelineData[i];
            if (data) {
                marks.push({
                    index: i,
                    label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    isToday: i === todayIndex
                });
            }
        }
        return marks;
    };

    const goToNow = (): void => {
        const now = todayIndex + new Date().getHours();
        if (mode === 'single') {
            setSingleHandle(now);
        } else {
            setRangeStart(now);
            setRangeEnd(now + 24);
        }
    };

    const goToToday = (): void => {
        if (mode === 'single') {
            setSingleHandle(todayIndex);
        } else {
            setRangeStart(todayIndex);
            setRangeEnd(todayIndex + 24);
        }
    };

    return (
        <div className="bg-white border-b border-gray-200 p-4">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setMode('single')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'single'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Single Handle
                        </button>
                        <button
                            onClick={() => setMode('range')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${mode === 'range'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Range Selection
                        </button>
                    </div>

                    <div className="flex items-center gap-2">

                        <button
                            onClick={goToNow}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                            Go to Now
                        </button>
                        <button
                            onClick={goToToday}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* Slider Container */}
                <div
                    ref={sliderRef}
                    className="relative h-12 bg-gray-200 rounded-lg cursor-pointer mb-4"
                    onClick={handleSliderClick}
                >
                    {/* Background track */}
                    <div className="absolute inset-0 bg-gray-300 rounded-lg" />

                    {/* Today indicator */}
                    <div
                        className="absolute top-0 w-1 h-full bg-red-300 z-10"
                        style={{ left: `${valueToPercent(todayIndex)}%` }}
                        title="Today"
                    />

                    {mode === 'single' ? (
                        // Single handle mode
                        <>
                            {/* Active track */}
                            <div
                                className="absolute top-2 h-8 bg-blue-500 rounded-lg opacity-30"
                                style={{
                                    left: '0%',
                                    width: `${valueToPercent(singleHandle)}%`
                                }}
                            />
                            {/* Handle */}
                            <div
                                className="absolute top-1 w-10 h-10 bg-blue-500 border-4 border-white rounded-full cursor-grab active:cursor-grabbing shadow-lg hover:scale-110 transition-transform z-20"
                                style={{ left: `calc(${valueToPercent(singleHandle)}% - 20px)` }}
                                onMouseDown={(e) => handleMouseDown(e, 'single')}
                                title={formatDateTime(singleHandle)}
                            />
                        </>
                    ) : (
                        // Range mode
                        <>
                            {/* Active track */}
                            <div
                                className="absolute top-2 h-8 bg-green-500 rounded-lg opacity-50"
                                style={{
                                    left: `${valueToPercent(rangeStart)}%`,
                                    width: `${valueToPercent(rangeEnd) - valueToPercent(rangeStart)}%`
                                }}
                            />
                            {/* Start handle */}
                            <div
                                className="absolute top-1 w-10 h-10 bg-green-500 border-4 border-white rounded-full cursor-grab active:cursor-grabbing shadow-lg hover:scale-110 transition-transform z-20"
                                style={{ left: `calc(${valueToPercent(rangeStart)}% - 20px)` }}
                                onMouseDown={(e) => handleMouseDown(e, 'start')}
                                title={`Start: ${formatDateTime(rangeStart)}`}
                            />
                            {/* End handle */}
                            <div
                                className="absolute top-1 w-10 h-10 bg-green-600 border-4 border-white rounded-full cursor-grab active:cursor-grabbing shadow-lg hover:scale-110 transition-transform z-20"
                                style={{ left: `calc(${valueToPercent(rangeEnd)}% - 20px)` }}
                                onMouseDown={(e) => handleMouseDown(e, 'end')}
                                title={`End: ${formatDateTime(rangeEnd)}`}
                            />
                        </>
                    )}
                </div>

                {/* Timeline marks */}
                <div className="relative h-8 mb-4">
                    {generateMarks().map((mark: TimelineMark) => (
                        <div
                            key={mark.index}
                            className={`absolute text-xs transform -translate-x-1/2 ${mark.isToday ? 'font-bold text-red-600' : 'text-gray-600'
                                }`}
                            style={{ left: `${valueToPercent(mark.index)}%` }}
                        >
                            {mark.label}
                            {mark.isToday && <div className="text-xs text-red-500">Today</div>}
                        </div>
                    ))}
                </div>

                {/* Selected Values Display */}
                <div className="bg-gray-50 rounded-lg p-3">
                    {mode === 'single' ? (
                        <div className="text-sm">
                            <span className="text-gray-600">Selected:</span>
                            <span className="ml-2 font-medium text-blue-600">
                                📅 {formatDateTime(singleHandle)}
                            </span>
                        </div>
                    ) : (
                        <div className="text-sm">
                            <span className="text-gray-600">Range:</span>
                            <span className="ml-2 font-medium text-green-600">
                                📅 {formatDateTime(rangeStart)} ➜ {formatDateTime(rangeEnd)}
                            </span>
                            <span className="ml-3 text-gray-500">
                                ({rangeEnd - rangeStart} hours, {Math.round((rangeEnd - rangeStart) / 24 * 10) / 10} days)
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimelineSlider;