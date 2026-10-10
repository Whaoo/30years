// Météo Open-Meteo (même point que l'ancienne version : nord de Paris)
export async function fetchWeather() {
    try {
        const hourlyResponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=48.91887379083734&longitude=2.3525760991500366&timezone=Europe/Berlin&hourly=weathercode,temperature_2m');
        const hourlyData = await hourlyResponse.json();

        const dailyResponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=48.91887379083734&longitude=2.3525760991500366&timezone=Europe/Berlin&daily=weathercode,temperature_2m_max,temperature_2m_min');
        const dailyData = await dailyResponse.json();

        return { hourlyData, dailyData };
    } catch (error) {
        console.error('Failed to fetch weather', error);
        return null;
    }
}

// Nom de l'icône (voir components/Icons.jsx) selon le code météo
export function getWeatherIcon(weatherCode, night = false) {
    if (weatherCode == null) return 'cloud';
    if (weatherCode === 0) return night ? 'moon' : 'sun';
    if (weatherCode === 1 || weatherCode === 2) return night ? 'moon' : 'cloud-sun';
    if (weatherCode === 3) return 'cloud';
    if (weatherCode === 45 || weatherCode === 48) return 'fog';
    if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'snow';
    if ([95, 96, 99].includes(weatherCode)) return 'storm';
    if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) return 'rain';
    return 'cloud';
}

export function getWeatherDescription(weatherCode) {
    const descriptions = {
        0: 'Ciel dégagé',
        1: 'Peu nuageux',
        2: 'Partiellement nuageux',
        3: 'Couvert',
        45: 'Brouillard',
        48: 'Brouillard givrant',
        51: 'Bruine légère',
        53: 'Bruine',
        55: 'Bruine dense',
        56: 'Bruine verglaçante',
        57: 'Bruine verglaçante',
        61: 'Pluie légère',
        63: 'Pluie modérée',
        65: 'Pluie forte',
        66: 'Pluie verglaçante',
        67: 'Pluie verglaçante',
        71: 'Neige légère',
        73: 'Neige',
        75: 'Neige forte',
        77: 'Grains de neige',
        80: 'Averses',
        81: 'Averses',
        82: 'Fortes averses',
        85: 'Averses de neige',
        86: 'Averses de neige',
        95: 'Orage',
        96: 'Orage et grêle',
        99: 'Orage et grêle'
    };
    return descriptions[weatherCode] || 'Météo variable';
}
