# Les films de la quête

## Les cinématiques d'épisode (chapitres 2, 3 et 4, environ 1 min chacune)

Avant chaque épisode : le méchant précédent vaincu (l'éclat rejoint l'écharpe de Flocon), le chemin sur la carte,
le dérèglement causé par le méchant suivant, puis Flocon qui arrive pour l'affronter et le titre de l'épisode.
- `v3/film_eps.js` : les plans (`FILM2`, `FILM3`, `FILM4`, `renderEp`). Ils réutilisent le prologue (`film_v3.js`, `mock.js`, la v2)
  et les maquettes de Chronoflocon (`v3/chrono_mock.js`, pour l'archipel et le bateau).
- `v3/eps.html?ep=2` expose `renderAt(t)` et `DUR` ; capture : `node capture_eps.js 0 3720 ../frames_ep2 2` (3 840 images pour le chapitre 4).
- `v3/soundtrack_eps.py 2 ep2.wav` : bande-son (mêmes instruments que le prologue, niveau aligné sur `soundtrack2.wav`).
- Épilogue « Joyeux Noël » (18 déc., 1 min 38) : `v3/film_noel.js` (`FILM5`, `eps.html?ep=5`, 5 880 images, `soundtrack_eps.py 5`) ;
  le générique reprend les prénoms de l'équipe (`TEAM`).
- Encodage comme le prologue ; vidéos et affiches : `public/film/chapitre2.mp4` / `.jpg`, etc. Liste et dates : `FILMS` dans `src/december/calendar.js`.

# Le prologue de la quête (film du 1er décembre)

Version en ligne : la v3 « conte » (2 min 20), dans `v3/` : livre à la bougie, carte du Royaume du Pôle avec zooms,
puis le montage v2 (fichiers ci-dessous) décalé de 23 s et restylé (narration Crimson Pro, titre Gloock, montagnes peintes, grain).
`v3/v3.html` expose `renderAt(t)` ; `v3/capture3.js` capture les 7 860 images ; `v3/soundtrack3.py` compose l'intro et raccorde la bande v2
(il lit `soundtrack2.wav`, produit par `soundtrack2.py`). Polices : `v3/fonts/` (licence OFL).

Court métrage v2 de 1 min 48 dessiné en code : chaque image ne dépend que du temps `t`.
Le site ne joue pas ce code : il lit la vidéo `public/film/prologue.mp4` (lecture au clic, son autorisé).

- `film_lib.js` : outils de dessin (pingouin, mouette, neige, aurores, montagnes, sous-titres, légendes).
- `film_v2_helpers.js`, `film_v2_scenes.js` : les plans et `renderFilm(ctx, t, buf)`.
- `render2.html` : page de rendu (`window.renderAt(t)`), pratique pour vérifier une image.
- `capture2.js` : capture des images (Playwright), ex. `node capture2.js 0 6480 frames2` (60 images/s).
- `soundtrack2.py` : bande-son originale synthétisée (numpy + scipy), `python3 soundtrack2.py soundtrack2.wav`.

Encodage : `ffmpeg -framerate 60 -i frames2/f%05d.jpg -i soundtrack2.wav -c:v libx264 -preset slow -crf 25 -profile:v high -level 4.0 -pix_fmt yuv420p -tune animation -c:a aac -b:a 128k -movflags +faststart -shortest prologue.mp4`
