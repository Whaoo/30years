import React from 'react';
import { getWeatherEmote, getWeatherDescription } from '../utils/weather';
import { useWeather } from '../hooks/useWeather';
import { Loader2 } from 'lucide-react';

const WeatherWidget = ({ compact = false, extended = false }) => {
    const { weather, loading } = useWeather();

    if (loading) {
        return <div className="flex justify-center items-center p-4 h-full"><Loader2 className="animate-spin text-white/50" /></div>;
    }

    if (!weather) {
        return <div className="text-white/50 text-xs text-center">Météo indisponible</div>;
    }

    const currentHour = new Date().getHours();
    const currentTemp = Math.round(weather.hourlyData.hourly.temperature_2m[currentHour]);
    const weatherCode = weather.hourlyData.hourly.weathercode[currentHour];
    const emote = getWeatherEmote(weatherCode);
    const desc = getWeatherDescription(weatherCode);

    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}`;

    // 3-day forecast
    const daily = weather.dailyData.daily;
    const forecast = [0, 1, 2].map(offset => {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        const dayName = offset === 0 ? "Auj." : date.toLocaleDateString('fr-FR', { weekday: 'short' });
        const code = daily.weathercode[offset];
        const maxTemp = Math.round(daily.temperature_2m_max[offset]);
        const minTemp = Math.round(daily.temperature_2m_min[offset]);
        return { dayName, emote: getWeatherEmote(code), maxTemp, minTemp };
    });

    // Extended Mode: Full card with current + 3-day forecast
    if (extended) {
        return (
            <div className="flex flex-col h-full">
                {/* Header */}
                <h2 className="text-xs font-bold tracking-[0.2em] text-white/80 mb-4 uppercase text-center">Météo Paris</h2>

                {/* Current Weather - Prominent */}
                <div className="flex-grow flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-white/60 font-medium uppercase tracking-wider">{dateStr}</span>
                        <span className="text-[10px] bg-green-500/80 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">En direct</span>
                    </div>
                    <span className="text-6xl mb-2">{emote}</span>
                    <span className="text-5xl font-bold tracking-tight">{currentTemp}°C</span>
                    <span className="text-sm text-white/70 mt-1 capitalize">{desc}</span>
                </div>

                {/* 3-Day Forecast */}
                <div className="mt-auto bg-black/20 rounded-2xl p-4 border border-white/5">
                    <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider text-center">Prévisions</h3>
                    <div className="flex justify-around">
                        {forecast.map((day, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <span className="text-[10px] text-white/50 uppercase font-bold mb-1">{day.dayName}</span>
                                <span className="text-2xl mb-1">{day.emote}</span>
                                <div className="flex flex-col items-center text-xs">
                                    <span className="font-bold text-white">{day.maxTemp}°</span>
                                    <span className="text-white/50">{day.minTemp}°</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Compact Mode: Just current weather (for mobile)
    if (compact) {
        return (
            <div className="pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-white">
                    <div className="flex flex-col">
                        <span className="text-xs text-white/60 font-medium uppercase tracking-wider">Paris • {dateStr}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold tracking-tight">{currentTemp}°C</span>
                            <span className="text-2xl">{emote}</span>
                        </div>
                    </div>
                    {/* Short-term forecast */}
                    <div className="flex gap-3">
                        {forecast.slice(1, 3).map((day, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <span className="text-[9px] text-white/50 uppercase font-bold">{day.dayName}</span>
                                <span className="text-lg">{day.emote}</span>
                                <span className="text-[10px] font-bold">{day.maxTemp}°</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Default: Original inline style (fallback)
    return (
        <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex items-center justify-between text-white">
                <div className="flex flex-col">
                    <span className="text-xs text-white/60 font-medium uppercase tracking-wider">Paris • {dateStr}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold tracking-tight">{currentTemp}°C</span>
                        <span className="text-3xl">{emote}</span>
                    </div>
                    <span className="text-sm text-white/70">{desc}</span>
                </div>
            </div>
        </div>
    );
};

export default WeatherWidget;
