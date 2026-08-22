import winterBackground from '../assets/winter-background.png';
import skiBackground from '../assets/ski-january-background.png';
import springBackground from '../assets/Fleurs de cerisiers.jpg';
import summerBackground from '../assets/ab8755cb-ed59-4dc5-90a5-0df43ea067b6 (1).jpeg';

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

const SEASON_THEMES = {
    winter: {
        label: 'Hiver',
        accent: '#7dd3fc',
        image: (date) => (date.getMonth() === 0 ? skiBackground : winterBackground),
        gradients: {
            day: ['linear-gradient(180deg, #93c5fd 0%, #e0f2fe 55%, #f8fafc 100%)'],
            dawn: ['linear-gradient(180deg, #7c9ccf 0%, #cbd5e1 60%, #f1f5f9 100%)'],
            dusk: ['linear-gradient(180deg, #312e81 0%, #6d28d9 50%, #be185d 100%)'],
            night: ['linear-gradient(180deg, #020617 0%, #0f172a 55%, #1e293b 100%)'],
        },
    },
    spring: {
        label: 'Printemps',
        accent: '#f9a8d4',
        image: () => springBackground,
        gradients: {
            day: ['linear-gradient(180deg, #bfdbfe 0%, #fce7f3 60%, #fef3c7 100%)'],
            dawn: ['linear-gradient(180deg, #fecdd3 0%, #fef3c7 60%, #fff7ed 100%)'],
            dusk: ['linear-gradient(180deg, #4c1d95 0%, #9d174d 55%, #fb7185 100%)'],
            night: ['linear-gradient(180deg, #0f172a 0%, #1e1b4b 55%, #4c1d95 100%)'],
        },
    },
    summer: {
        label: 'Été',
        accent: '#fde047',
        image: () => summerBackground,
        gradients: {
            day: ['linear-gradient(180deg, #38bdf8 0%, #fde68a 70%, #fca5a5 100%)'],
            dawn: ['linear-gradient(180deg, #fdba74 0%, #fef08a 55%, #ffedd5 100%)'],
            dusk: ['linear-gradient(180deg, #7c2d12 0%, #c2410c 45%, #f59e0b 100%)'],
            night: ['linear-gradient(180deg, #020617 0%, #172554 55%, #312e81 100%)'],
        },
    },
    autumn: {
        label: 'Automne',
        accent: '#fb923c',
        image: () => null,
        gradients: {
            day: ['linear-gradient(160deg, #f97316 0%, #fbbf24 35%, #78716c 70%, #44403c 100%)', 'gradientShift'],
            dawn: ['linear-gradient(160deg, #fb923c 0%, #fcd34d 40%, #92400e 100%)', 'gradientShift'],
            dusk: ['linear-gradient(160deg, #7c2d12 0%, #b45309 40%, #1c1917 100%)', 'gradientShift'],
            night: ['linear-gradient(160deg, #0c0a09 0%, #292524 50%, #7c2d12 100%)', 'gradientShift'],
        },
    },
};

const MOOD_OVERLAYS = {
    clear: null,
    cloudy: 'rgba(51, 65, 85, 0.22)',
    fog: 'rgba(148, 163, 184, 0.28)',
    rain: 'rgba(15, 23, 42, 0.32)',
    storm: 'rgba(30, 27, 75, 0.48)',
    snow: 'rgba(30, 58, 138, 0.14)',
};

const TIME_OVERLAYS = {
    day: null,
    dawn: 'rgba(253, 186, 116, 0.14)',
    dusk: 'rgba(76, 29, 149, 0.22)',
    night: 'rgba(2, 6, 23, 0.42)',
};

export function resolveTheme(date = new Date(), weatherCode = null) {
    const season = getSeason(date);
    const timeOfDay = getTimeOfDay(date.getHours());
    let mood = getWeatherMood(weatherCode);

    if (mood === 'snow' && season !== 'winter') {
        mood = 'rain';
    }

    const config = SEASON_THEMES[season];
    const gradient = config.gradients[timeOfDay];

    return {
        key: `${season}-${timeOfDay}-${mood}`,
        season,
        timeOfDay,
        mood,
        label: `${config.label} • ${timeOfDay}`,
        accent: config.accent,
        image: config.image(date),
        gradient,
        overlays: [TIME_OVERLAYS[timeOfDay], MOOD_OVERLAYS[mood]].filter(Boolean),
        particles: mood === 'rain' || mood === 'storm' ? 'rain' : mood === 'snow' ? 'snow' : null,
    };
}
