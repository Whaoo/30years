// Plugin Vite : publie l'agenda des anniversaires à partir de src/utils/birthdayLogic.js
//   /anniversaires.ics (tout le monde) et /anniversaires/<prenom>-<jjmm>.ics (une personne, pour les nouveaux venus).
// - `npm run build` : les fichiers sont écrits dans dist/ (rien à générer à la main, une nouvelle ligne dans la liste suffit) ;
// - `npm run dev` : servis à la volée, relus à chaque requête.
// Le type text/calendar en production vient de public/_headers.
import { birthdays } from '../../src/utils/birthdayLogic.js';
import { AGENDA_DIR, AGENDA_FILE, agendaFiles } from '../../src/utils/agenda.js';

export default function agendaPlugin() {
    return {
        name: 'agenda-anniversaires',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                const path = (req.url || '').split('?')[0].replace(/^\//, '');
                if (path !== AGENDA_FILE && !path.startsWith(AGENDA_DIR + '/')) return next();
                try {
                    const { birthdays: list } = await server.ssrLoadModule('/src/utils/birthdayLogic.js');
                    const file = agendaFiles(list).find((f) => f.fileName === decodeURIComponent(path));
                    if (!file) return next();
                    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
                    res.setHeader('Cache-Control', 'no-store');
                    res.end(file.source);
                } catch (e) {
                    next(e);
                }
            });
        },
        generateBundle() {
            for (const f of agendaFiles(birthdays)) this.emitFile({ type: 'asset', fileName: f.fileName, source: f.source });
        },
    };
}
