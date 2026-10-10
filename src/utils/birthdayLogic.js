// Liste des anniversaires : prénom + date au format 'JJ-MM'.
// Pas d'année de naissance, donc pas d'âge affiché.
export const birthdays = [
    { name: 'Nathalie', date: '13-11' },
    { name: 'Eddy', date: '12-04' },
    { name: 'Théophane', date: '16-03' },
    { name: 'Alice', date: '10-12' },
    { name: 'Adele', date: '07-08' },
    { name: 'Dorian', date: '01-07' },
    { name: 'Hugo', date: '07-08' },
    { name: 'Julian', date: '15-08' },
    { name: 'Louis', date: '19-09' },
    { name: 'Mélissa', date: '16-09' },
    { name: 'Noémie', date: '14-06' },
    { name: 'Clément', date: '30-01' },
    { name: 'Sophie', date: '02-07' },
    { name: 'Sarah', date: '27-12' },
    { name: 'Benjamin', date: '29-04' },
    { name: 'Paul Henri', date: '08-05' },
    { name: 'Pierre', date: '17-05' },
    { name: 'Claire', date: '19-08' },
    { name: 'Guillaume', date: '31-10' },
    { name: 'Soizic', date: '05-12' },
    { name: 'Thomas', date: '30-04' },
    { name: 'Laetitia', date: '17-06' },
    { name: 'Jeremy', date: '25-01' },
    { name: 'Thibault', date: '03-12' },
    { name: 'Maelys', date: '29-12' },
    { name: 'Brieuc', date: '26-03' },
    { name: 'Aicha', date: '14-07' },
    { name: 'Auderic', date: '11-12' },
    { name: 'Laura', date: '07-11' },
    { name: 'Emilie', date: '11-05' },
    { name: 'Noël', date: '25-12' }
];

export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const SHORT_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

// Tenue de chaque pingouin, attribuée selon la position dans la liste.
const SCARVES = ['#ff6b6b', '#34d399', '#a78bfa', '#60a5fa', '#fbbf24', '#f472b6', '#2dd4bf', '#fb923c', '#f87171', '#4ade80'];
const HAT_COLORS = ['#3b82f6', '#f59e0b', '#dc2626', '#0ea5e9', '#7c3aed', '#10b981'];
const HATS = ['beanie', 'none', 'shades', 'beanie', 'none', 'beanie', 'shades'];

const MS_DAY = 86400000;

export function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Nombre de jours calendaires entre deux dates (insensible à l'heure et au changement d'heure)
export function daysBetween(from, to) {
    return Math.round((startOfDay(to) - startOfDay(from)) / MS_DAY);
}

export function getNextBirthday(dateStr, now = new Date()) {
    const [day, month] = dateStr.split('-').map(Number);
    const today = startOfDay(now);
    let next = new Date(today.getFullYear(), month - 1, day);
    if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day);
    return next;
}

function outfitFor(name, index) {
    if (name === 'Noël') return { hat: 'beanie', scarf: '#ffd36e', hatColor: '#d63a3a' };
    return {
        hat: HATS[index % HATS.length],
        scarf: SCARVES[index % SCARVES.length],
        hatColor: HAT_COLORS[index % HAT_COLORS.length]
    };
}

export function getSortedBirthdays(now = new Date()) {
    return birthdays
        .map((birthday, index) => {
            const nextBirthday = getNextBirthday(birthday.date, now);
            return {
                ...birthday,
                ...outfitFor(birthday.name, index),
                id: `${birthday.name}-${birthday.date}`,
                index,
                nextBirthday,
                days: daysBetween(now, nextBirthday)
            };
        })
        .sort((a, b) => a.days - b.days || a.index - b.index);
}

export function formatDay(date) {
    return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function whenLabel(days) {
    if (days === 0) return 'Aujourd’hui';
    if (days === 1) return 'Demain';
    return `J-${days}`;
}

export function joinNames(names) {
    if (names.length <= 1) return names[0] || '';
    return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}
