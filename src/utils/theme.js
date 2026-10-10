// Thème visuel : saison (décor illustré) + moment de la journée + météo réelle.
const SNOW_CODES = [71, 73, 75, 77, 85, 86];
const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];
const STORM_CODES = [95, 96, 99];
const FOG_CODES = [45, 48];

export function getSeason(date) {
    const month = date.getMonth() + 1;
    if (month === 12 || month <= 2) return 'winter';
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    return 'autumn';
}

export function getTimeOfDay(hour) {
    if (hour >= 6 && hour < 9) return 'dawn';
    if (hour >= 9 && hour < 18) return 'day';
    if (hour >= 18 && hour < 21) return 'dusk';
    return 'night';
}

export function getWeatherMood(weatherCode) {
    if (weatherCode == null) return 'clear';
    if (SNOW_CODES.includes(weatherCode)) return 'snow';
    if (STORM_CODES.includes(weatherCode)) return 'storm';
    if (RAIN_CODES.includes(weatherCode)) return 'rain';
    if (FOG_CODES.includes(weatherCode)) return 'fog';
    if ([0, 1].includes(weatherCode)) return 'clear';
    return 'cloudy';
}

const SEASONS = {
    autumn: {
        label: 'Automne',
        sky: 'linear-gradient(180deg, #2a1b3d 0%, #6e2f4c 40%, #b9532f 80%, #d9803a 100%)',
        sun: '#ffd08a',
        sunGlow: 'rgba(255, 170, 90, 0.55)',
        hill1: '#4a2230',
        hill2: '#2f1624',
        accent: '#ffc15e',
        particle: '#ff9a3c',
        particleShape: '50% 0 50% 0',
        particleAnim: 'fall'
    },
    winter: {
        label: 'Hiver',
        sky: 'linear-gradient(180deg, #070d24 0%, #14306a 50%, #3f6fa8 100%)',
        sun: '#eaf4ff',
        sunGlow: 'rgba(180, 215, 255, 0.45)',
        hill1: '#dfeaf6',
        hill2: '#a9c6e4',
        accent: '#ffd36e',
        particle: '#ffffff',
        particleShape: '50%',
        particleAnim: 'fall'
    },
    spring: {
        label: 'Printemps',
        sky: 'linear-gradient(180deg, #173a52 0%, #2f7d84 45%, #a96f93 100%)',
        sun: '#fff2c9',
        sunGlow: 'rgba(255, 230, 170, 0.5)',
        hill1: '#2f7a58',
        hill2: '#1f5a45',
        accent: '#ffc2dc',
        particle: '#ffd1e6',
        particleShape: '50% 50% 0 50%',
        particleAnim: 'fall'
    },
    summer: {
        label: 'Été',
        sky: 'linear-gradient(180deg, #0e4a85 0%, #1f84b5 48%, #c98d3d 100%)',
        sun: '#fff0a8',
        sunGlow: 'rgba(255, 225, 120, 0.6)',
        hill1: '#c48d38',
        hill2: '#9d6a22',
        accent: '#ffe27a',
        particle: 'rgba(255, 240, 170, 0.9)',
        particleShape: '50%',
        particleAnim: 'rise'
    }
};

const TIME_LABELS = { dawn: 'matin', day: 'journée', dusk: 'soir', night: 'nuit' };

const TIME_OVERLAYS = {
    day: null,
    dawn: 'rgba(253, 186, 116, 0.12)',
    dusk: 'rgba(76, 29, 149, 0.2)',
    night: 'rgba(2, 6, 23, 0.4)'
};

const MOOD_OVERLAYS = {
    clear: null,
    cloudy: 'rgba(51, 65, 85, 0.2)',
    fog: 'rgba(148, 163, 184, 0.24)',
    rain: 'rgba(15, 23, 42, 0.28)',
    storm: 'rgba(30, 27, 75, 0.42)',
    snow: 'rgba(30, 58, 138, 0.12)'
};

export function resolveTheme(date = new Date(), weatherCode = null) {
    const season = getSeason(date);
    const timeOfDay = getTimeOfDay(date.getHours());
    let mood = getWeatherMood(weatherCode);
    if (mood === 'snow' && season !== 'winter') mood = 'rain';

    const base = SEASONS[season];
    const night = timeOfDay === 'night';

    return {
        ...base,
        season,
        timeOfDay,
        timeLabel: TIME_LABELS[timeOfDay],
        mood,
        // La nuit, le soleil devient une lune
        sun: night ? '#eef3ff' : base.sun,
        sunGlow: night ? 'rgba(200, 220, 255, 0.35)' : base.sunGlow,
        overlays: [TIME_OVERLAYS[timeOfDay], MOOD_OVERLAYS[mood]].filter(Boolean),
        weatherParticles: mood === 'rain' || mood === 'storm' ? 'rain' : mood === 'snow' ? 'snow' : null
    };
}

// Variables CSS posées sur la racine de l'app
export function themeStyle(theme) {
    return {
        '--sky': theme.sky,
        '--sun': theme.sun,
        '--sun-glow': theme.sunGlow,
        '--hill1': theme.hill1,
        '--hill2': theme.hill2,
        '--accent': theme.accent,
        '--particle': theme.particle
    };
}
