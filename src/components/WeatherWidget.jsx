import React, { useState, useEffect } from 'react';
import { fetchWeather, getWeatherEmote, getWeatherDescription } from '../utils/weather';
import { Cloud, Loader2 } from 'lucide-react';

const WeatherWidget = () => {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadWeather() {
            const data = await fetchWeather();
            if (data) {
                setWeather(data);
            }
            setLoading(false);
        }
        loadWeather();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-white/50" /></div>;
    }

    if (!weather) {
        return <div className="text-white/50 text-xs text-center">Météo indisponible</div>;
    }

    const currentTemp = Math.round(weather.hourlyData.hourly.temperature_2m[new Date().getHours()]);
    const weatherCode = weather.hourlyData.hourly.weathercode[new Date().getHours()];
    const emote = getWeatherEmote(weatherCode);
    const desc = getWeatherDescription(weatherCode);

    // Forecast Data
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

    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}`;

    return (
        <div className="mt-auto pt-6 border-t border-white/10">
            {/* Current Weather & Short-term Forecast */}
            <div className="flex items-center justify-between text-white mb-4">
                <div className="flex flex-col">
                    <span className="text-xs text-white/60 font-medium uppercase tracking-wider">Paris • {dateStr}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold tracking-tight">{currentTemp}°C</span>
                        <span className="text-3xl">{emote}</span>
                    </div>
                    <span className="text-sm text-white/70">{desc}</span>
                </div>

                {/* Short-term Forecast (Right side) */}
                <div className="flex gap-4">
                    {(() => {
                        const currentHour = new Date().getHours();
                        let targets = [];

                        if (currentHour < 12) {
                            // Morning -> Show Afternoon (15h) & Evening (20h)
                            targets = [
                                { label: 'Aprem', hourIndex: 15 },
                                { label: 'Soir', hourIndex: 20 }
                            ];
                        } else {
                            // Afternoon -> Show Evening (20h) only
                            targets = [
                                { label: 'Soir', hourIndex: 20 }
                            ];
                        }

                        return targets.map((target, i) => {
                            const temp = Math.round(weather.hourlyData.hourly.temperature_2m[target.hourIndex]);
                            const code = weather.hourlyData.hourly.weathercode[target.hourIndex];
                            const em = getWeatherEmote(code);

                            return (
                                <div key={i} className="flex flex-col items-center">
                                    <span className="text-[10px] text-white/50 uppercase font-bold">{target.label}</span>
                                    <span className="text-lg">{em}</span>
                                    <span className="text-xs font-bold">{temp}°</span>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>


        </div>
    );
};

export default WeatherWidget;
