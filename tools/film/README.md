# Le prologue de la quête (film du 1er décembre)

Court métrage de 1 min 48 dessiné en code : chaque image ne dépend que du temps `t`.
Le site ne joue pas ce code : il lit la vidéo `public/film/prologue.mp4` (lecture au clic, son autorisé).

- `film_lib.js` : outils de dessin (pingouin, mouette, neige, aurores, montagnes, sous-titres, légendes).
- `film_v2_helpers.js`, `film_v2_scenes.js` : les plans et `renderFilm(ctx, t, buf)`.
- `render2.html` : page de rendu (`window.renderAt(t)`), pratique pour vérifier une image.
- `capture2.js` : capture des images (Playwright), ex. `node capture2.js 0 6480 frames2` (60 images/s).
- `soundtrack2.py` : bande-son originale synthétisée (numpy + scipy), `python3 soundtrack2.py soundtrack2.wav`.

Encodage : `ffmpeg -framerate 60 -i frames2/f%05d.jpg -i soundtrack2.wav -c:v libx264 -preset slow -crf 25 -profile:v high -level 4.0 -pix_fmt yuv420p -tune animation -c:a aac -b:a 128k -movflags +faststart -shortest prologue.mp4`
