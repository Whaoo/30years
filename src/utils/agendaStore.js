// Ce que ce navigateur a déjà ajouté à son agenda (identifiants de agendaPeople), pour ne proposer ensuite
// que les nouveaux venus. Stocké dans 30years:agenda = { ids: [...], depuis: date du premier ajout }.
// Rien n'est envoyé au serveur ; si le stockage est indisponible, la fenêtre repropose simplement tout le fichier.
const KEY = '30years:agenda';

export function agendaState() {
    try {
        const v = JSON.parse(window.localStorage.getItem(KEY));
        return v && Array.isArray(v.ids) ? v : null;
    } catch {
        return null;
    }
}

export function markAdded(ids) {
    const s = agendaState();
    const all = new Set([...(s ? s.ids : []), ...ids]);
    try {
        window.localStorage.setItem(KEY, JSON.stringify({ ids: [...all], depuis: (s && s.depuis) || new Date().toISOString() }));
    } catch {
        /* stockage indisponible : tant pis, rien de grave */
    }
}

// null si rien n'a jamais été ajouté depuis ce navigateur, sinon la liste des personnes pas encore ajoutées
export function notYetAdded(people) {
    const s = agendaState();
    if (!s) return null;
    const known = new Set(s.ids);
    return people.filter((p) => !known.has(p.id));
}
