// Agenda des anniversaires au format iCalendar (RFC 5545), à télécharger et à ajouter une fois à l'agenda du téléphone.
// Générés à chaque build depuis la liste de birthdayLogic.js (plugin Vite dans tools/agenda/) :
//   /anniversaires.ics                 tout le monde ;
//   /anniversaires/<prenom>-<jjmm>.ics  une personne (les « compléments » quand quelqu'un arrive dans l'équipe).
// Le navigateur retient ce qui a déjà été ajouté (src/utils/agendaStore.js) et propose ensuite seulement les nouveaux.
// Pas d'année ni d'âge : chaque anniversaire est un événement d'une journée qui revient tous les ans.
// Ce fichier ne dépend ni du navigateur ni de Node (il sert au build et à la fenêtre « Dans mon agenda »).

export const AGENDA_FILE = 'anniversaires.ics';
export const AGENDA_PATH = '/' + AGENDA_FILE;
export const AGENDA_DIR = 'anniversaires';
export const AGENDA_NAME = 'Anniversaires de l’équipe';
export const SITE_URL = 'https://30years.pages.dev';
const ALARM_HOUR = 9; // rappel le jour J à 9 h (heure du téléphone)
const BASE_YEAR = 2024; // première occurrence (année bissextile : un 29 février reste possible)
// « Noël » est la mascotte de la liste du site, pas un collègue : il n'a rien à faire dans l'agenda
const SKIP = new Set(['Noël']);

const pad = (n) => String(n).padStart(2, '0');
function slug(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Les collègues de l'agenda, avec un identifiant stable (prénom + jour) : il sert d'UID dans les fichiers
// (un fichier réimporté ne crée pas de doublon) et de clé pour savoir ce qui est déjà dans l'agenda.
// Ne pas changer sa forme : les agendas déjà remplis ne reconnaîtraient plus personne.
export function agendaPeople(list) {
    const seen = new Map();
    const out = [];
    for (const p of list) {
        if (SKIP.has(p.name)) continue;
        const [d, m] = String(p.date).split('-').map(Number);
        if (!d || !m || d > 31 || m > 12) continue;
        let id = `${slug(p.name)}-${pad(d)}${pad(m)}`;
        const n = (seen.get(id) || 0) + 1;
        seen.set(id, n);
        if (n > 1) id += `-${n}`; // homonymes nés le même jour
        out.push({ name: p.name, d, m, id, uid: `anniversaire-${id}` });
    }
    return out;
}
export const personPath = (p) => `/${AGENDA_DIR}/${p.id}.ics`;

// « de Claire », « d’Eddy », « d’Hugo »
export function deName(name) {
    return (/^[aeiouyàâäéèêëîïôöûüœh]/i.test(name) ? 'd’' : 'de ') + name;
}

// Texte iCalendar : antislash, point-virgule, virgule et retours à la ligne échappés
function esc(text) {
    return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Une ligne fait au plus 75 octets (UTF-8) ; la suite repart après un retour et une espace, sans couper un caractère
function utf8Len(ch) {
    const c = ch.codePointAt(0);
    return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
}
export function fold(line) {
    const parts = [];
    let cur = '';
    let size = 0;
    let max = 75;
    for (const ch of line) {
        const n = utf8Len(ch);
        if (size + n > max) {
            parts.push(cur);
            cur = '';
            size = 0;
            max = 74; // la ligne suivante commence par une espace
        }
        cur += ch;
        size += n;
    }
    parts.push(cur);
    return parts.join('\r\n ');
}

function utcStamp(t) {
    return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}${pad(t.getUTCSeconds())}Z`;
}
// jour de l'anniversaire et lendemain (fin exclusive d'un événement d'une journée), au format AAAAMMJJ
function days(p) {
    const end = new Date(Date.UTC(BASE_YEAR, p.m - 1, p.d + 1));
    return [`${BASE_YEAR}${pad(p.m)}${pad(p.d)}`, `${end.getUTCFullYear()}${pad(end.getUTCMonth() + 1)}${pad(end.getUTCDate())}`];
}
// un 29 février tombe le 28 les autres années
const rrule = (p) => (p.d === 29 && p.m === 2 ? 'RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1' : 'RRULE:FREQ=YEARLY');
const summary = (p) => `🎂 Anniversaire ${deName(p.name)}`;
const details = (p, site) =>
    `C’est l’anniversaire ${deName(p.name)} ! Le bouton « Souhaiter un joyeux anniversaire » s’allume ce jour-là sur ${site}\n`
    + `Un nouveau collègue dans l’équipe ? Ajoute son anniversaire : ${site}/agenda`;

// Le fichier .ics de ces personnes (déjà passées par agendaPeople) ; stamp : date du build (DTSTAMP)
export function icsFor(people, { stamp = new Date(), site = SITE_URL } = {}) {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//30years//Anniversaires de l’équipe//FR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `NAME:${esc(AGENDA_NAME)}`,
        `X-WR-CALNAME:${esc(AGENDA_NAME)}`,
        'X-APPLE-CALENDAR-COLOR:#FF9F43',
    ];
    const dtstamp = utcStamp(stamp);
    for (const p of people) {
        const [start, end] = days(p);
        lines.push(
            'BEGIN:VEVENT',
            `UID:${p.uid}@30years.pages.dev`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART;VALUE=DATE:${start}`,
            `DTEND;VALUE=DATE:${end}`,
            rrule(p),
            `SUMMARY:${esc(summary(p))}`,
            `DESCRIPTION:${esc(details(p, site))}`,
            `URL:${site}/`,
            'CATEGORIES:Anniversaire',
            'TRANSP:TRANSPARENT',
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            `DESCRIPTION:${esc(`${summary(p)} aujourd’hui`)}`,
            `TRIGGER;RELATED=START:PT${ALARM_HOUR}H`,
            'END:VALARM',
            'END:VEVENT'
        );
    }
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
}

// Tous les fichiers à publier : [{ fileName, source }] (le complet, puis un par personne)
export function agendaFiles(list, opts) {
    const people = agendaPeople(list);
    return [
        { fileName: AGENDA_FILE, source: icsFor(people, opts) },
        ...people.map((p) => ({ fileName: `${AGENDA_DIR}/${p.id}.ics`, source: icsFor([p], opts) })),
    ];
}

// Ajout direct d'une personne dans Google Agenda (sur téléphone comme sur ordinateur), sans fichier :
// l'événement se crée dans l'agenda de la personne, avec ses notifications habituelles.
export function googleLink(p, site = SITE_URL) {
    const [start, end] = days(p);
    const q = new URLSearchParams({
        action: 'TEMPLATE',
        text: summary(p),
        dates: `${start}/${end}`,
        details: details(p, site),
        recur: rrule(p),
    });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
}
