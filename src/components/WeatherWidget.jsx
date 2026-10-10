import Icon from './Icons';
import { getWeatherDescription, getWeatherIcon } from '../utils/weather';

// Étiquette météo en direct dans l'en-tête
export default function WeatherWidget({ weather, night = false }) {
    const hourly = weather?.hourlyData?.hourly;
    if (!hourly) return null;

    const hour = new Date().getHours();
    const temp = Math.round(hourly.temperature_2m[hour]);
    const code = hourly.weathercode[hour];

    return (
        <span className="chip glass-soft hide-sm">
            <Icon name={getWeatherIcon(code, night)} size={18} />
            <span>Paris · {temp} °C · {getWeatherDescription(code)}</span>
        </span>
    );
}
