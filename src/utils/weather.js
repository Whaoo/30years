// Function to fetch weather data from Open-Meteo API
export async function fetchWeather() {
    try {
        const hourlyResponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=48.91887379083734&longitude=2.3525760991500366&timezone=Europe/Berlin&hourly=weathercode,temperature_2m');
        const hourlyData = await hourlyResponse.json();

        const dailyResponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=48.91887379083734&longitude=2.3525760991500366&timezone=Europe/Berlin&daily=weathercode,temperature_2m_max,temperature_2m_min');
        const dailyData = await dailyResponse.json();

        return { hourlyData, dailyData };
    } catch (error) {
        console.error("Failed to fetch weather", error);
        return null;
    }
}

// Function to get weather emote based on weather code
export function getWeatherEmote(weatherCode) {
    const weatherEmotes = {
        0: '☀️', // Clear sky
        1: '🌤️', // Mainly clear
        2: '⛅', // Partly cloudy
        3: '☁️', // Overcast
        45: '🌫️', // Fog
        48: '🌫️', // Depositing rime fog
        51: '🌦️', // Drizzle: Light
        53: '🌦️', // Drizzle: Moderate
        55: '🌦️', // Drizzle: Dense intensity
        56: '🌧️', // Freezing Drizzle: Light
        57: '🌧️', // Freezing Drizzle: Dense intensity
        61: '🌧️', // Rain: Slight
        63: '🌧️', // Rain: Moderate
        65: '🌧️', // Rain: Heavy intensity
        66: '🌨️', // Freezing Rain: Light
        67: '🌨️', // Freezing Rain: Heavy intensity
        71: '❄️', // Snow fall: Slight
        73: '❄️', // Snow fall: Moderate
        75: '❄️', // Snow fall: Heavy intensity
        77: '❄️', // Snow grains
        80: '🌧️', // Rain showers: Slight
        81: '🌧️', // Rain showers: Moderate
        82: '🌧️', // Rain showers: Violent
        85: '❄️', // Snow showers slight
        86: '❄️', // Snow showers heavy
        95: '⛈️', // Thunderstorm: Slight or moderate
        96: '⛈️', // Thunderstorm with slight hail
        99: '⛈️', // Thunderstorm with heavy hail
    };
    return weatherEmotes[weatherCode] || '❓';
}

export function getWeatherDescription(weatherCode) {
    const descriptions = {
        0: 'Ciel dégagé',
        1: 'Peu nuageux',
        2: 'Partiellement nuageux',
        3: 'Couvert',
        45: 'Brouillard',
        61: 'Pluie légère',
        63: 'Pluie modérée',
        65: 'Pluie forte',
        71: 'Neige légère',
        95: 'Orage',
    };
    return descriptions[weatherCode] || 'Météo variable';
}
