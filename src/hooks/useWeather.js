import { useEffect, useState } from 'react';
import { fetchWeather } from '../utils/weather';

let weatherPromise = null;

function getWeatherPromise() {
    if (!weatherPromise) {
        weatherPromise = fetchWeather();
    }
    return weatherPromise;
}

export function useWeather() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        getWeatherPromise().then((data) => {
            if (!mounted) return;
            if (data) setWeather(data);
            setLoading(false);
        });
        return () => {
            mounted = false;
        };
    }, []);

    return { weather, loading };
}
