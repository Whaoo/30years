-- Classements des jeux (Cloudflare D1). À coller une fois dans la console de chaque base :
-- 30years-scores (production) et 30years-scores-dev (préversions). Relancer ce fichier ne casse rien.

-- Un joueur = un pseudo choisi librement. On ne garde que des empreintes SHA-256 de son code pour un autre appareil
-- et des clés secrètes de ses navigateurs (une par appareil). Ni e-mail ni adresse IP.
CREATE TABLE IF NOT EXISTS joueurs (
    id INTEGER PRIMARY KEY,
    pseudo TEXT NOT NULL,
    pseudo_cle TEXT NOT NULL UNIQUE,   -- pseudo normalisé (minuscules, sans accents ni espaces) : « Zoé » = « zoe »
    code TEXT NOT NULL,
    cree TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cles (
    jeton TEXT PRIMARY KEY,            -- empreinte de la clé gardée dans un navigateur
    joueur INTEGER NOT NULL REFERENCES joueurs(id) ON DELETE CASCADE,
    cree TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Toutes les parties terminées (pour le classement du jour et le contrôle du rythme d'envoi)
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY,
    joueur INTEGER NOT NULL REFERENCES joueurs(id) ON DELETE CASCADE,
    jeu TEXT NOT NULL,
    score INTEGER NOT NULL,
    jour TEXT NOT NULL,                -- date de Paris, AAAA-MM-JJ
    cree TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS scores_jeu_jour ON scores (jeu, jour);
CREATE INDEX IF NOT EXISTS scores_joueur ON scores (joueur, cree);

-- Le meilleur score de chaque joueur pour chaque jeu : c'est le classement « de tous les temps », très peu coûteux à lire
CREATE TABLE IF NOT EXISTS records (
    jeu TEXT NOT NULL,
    joueur INTEGER NOT NULL REFERENCES joueurs(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    quand TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (jeu, joueur)
);
CREATE INDEX IF NOT EXISTS records_jeu_score ON records (jeu, score DESC);

-- Avis demandés avant un jeu (« Laura, tu as pensé quoi de Hunger Games ? ») : note de 1 à 5, commentaire facultatif.
-- L'API la crée aussi d'elle-même à la première réponse. Pour lire les réponses : SELECT * FROM avis ORDER BY id DESC;
CREATE TABLE IF NOT EXISTS avis (
    id INTEGER PRIMARY KEY,
    question TEXT NOT NULL,            -- ex. hunger-games
    pseudo TEXT NOT NULL,              -- la personne à qui on pose la question (Laura)
    joueur TEXT,                       -- le pseudo du classement de ce navigateur, s'il y en a un
    jeu TEXT,                          -- le jeu avant lequel la question a été posée
    note INTEGER NOT NULL,             -- 1 à 5 étoiles
    commentaire TEXT NOT NULL DEFAULT '',
    jour TEXT NOT NULL,                -- date de Paris
    cree TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fantômes du Col du Fuji (créée aussi par l'API au premier usage) : le parcours du record de chaque joueur, par circuit
CREATE TABLE IF NOT EXISTS fantomes (
    jeu TEXT NOT NULL,                 -- fuji (circuit 1) ou fuji-2 … fuji-11
    joueur INTEGER NOT NULL REFERENCES joueurs(id) ON DELETE CASCADE,
    temps INTEGER NOT NULL,            -- centièmes, égal au record du joueur quand le fantôme a été envoyé
    data TEXT NOT NULL,                -- { car, pr, d, psi } : 10 positions par seconde
    quand TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (jeu, joueur)
);
