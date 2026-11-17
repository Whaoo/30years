// Une fausse base D1 au-dessus de node:sqlite (Node 22+), pour tester l'API des classements sans Cloudflare.
// Même interface que D1 pour ce que l'API utilise : prepare().bind().first()/all()/run() et batch().
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function d1Local(fichier = ':memory:', schema = new URL('../../classement/schema.sql', import.meta.url)) {
    const db = new DatabaseSync(fichier);
    db.exec(readFileSync(schema, 'utf8'));
    const stmt = (sql, params = []) => ({
        bind: (...p) => stmt(sql, p),
        first: async () => db.prepare(sql).get(...params) ?? null,
        all: async () => ({ results: db.prepare(sql).all(...params) }),
        run: async () => { const r = db.prepare(sql).run(...params); return { meta: { changes: r.changes } }; },
        _run: () => db.prepare(sql).run(...params)
    });
    return {
        prepare: (sql) => stmt(sql),
        batch: async (list) => {
            db.exec('BEGIN');
            try { for (const s of list) s._run(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
            return list.map(() => ({ success: true }));
        },
        sql: db
    };
}
