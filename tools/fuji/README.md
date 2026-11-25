# Les circuits du Col du Fuji

Le circuit n° 1 (le Col du Fuji d'origine) est écrit à la main dans `public/jeux/col-du-fuji.html`.
Les circuits 2 à 11 sont dessinés « à la tortue » dans `designs.mjs` : lignes droites `S(l)` et virages `T(angle, rayon)`
(+ à droite), deux lignes droites `A(l)` dont la longueur est ajustée pour fermer la boucle exactement, et un profil d'altitude.

1. `node build-circuits.mjs` : points de contrôle (départ au début de la plus longue ligne droite), lac, pagode, direction
   du Fuji, allée de torii ; affiche les mesures (longueur, rayon minimal, pente, écart minimal entre deux portions de route,
   distance au lac) et écrit `circuits.json` et `tracks2.json`.
2. `python3 draw.py tracks2.json planche.png` : la vue de dessus de chaque tracé (rouge = virage serré), pour vérifier.
3. `python3 gen-js.py` : écrit `circuits.js` (la constante `CIRCUITS`, n° 1 compris) à recoller à la place de celle de
   `col-du-fuji.html`.

Règles tenues par les 10 tracés : rayon d'au moins 15 m, pente sous 15 %, au moins 67 m entre deux portions de route
qui ne se suivent pas (le terrain est une grille de 21 m : plus près, il recouvrirait la route du dessous), lac à 80 m au moins.
Après un changement de tracé : relancer le pilote d'essai (`fuji.bot`) sur le circuit et mettre à jour son temps minimal
dans `MIN_CIRCUITS` (`classement/api.js`, 80 % du pilote rapide). Ne pas modifier un tracé déjà en ligne : les records
et les fantômes de son classement ne voudraient plus rien dire.
