// Les 10 nouveaux circuits (le n° 1 reste le Col du Fuji d'origine, inchangé). + = virage à droite.
// A(l) : ligne droite dont la longueur est ajustée pour fermer la boucle exactement.
const S = (l) => ['S', l], A = (l) => ['S', l, 'adj'], T = (a, r) => ['T', a, r];
const hairR = (r = 20, gap = 40) => [T(90, r), S(gap), T(90, r)];     // épingle « carrée » : deux quarts de tour serrés
const hairL = (r = 20, gap = 40) => [T(-90, r), S(gap), T(-90, r)];
const slalom = (n, a, r) => Array.from({ length: n }, () => [T(-a, r), T(a, r)]).flat();
export const DESIGNS = [
  { id: 2, name: 'Le tour du lac', blurb: 'Grandes courbes rapides autour du lac, le Fuji en face au départ.',
    cmds: [A(260), T(75, 200), S(200), T(35, 140), T(-20, 160), T(60, 220), A(220), T(85, 260), S(200), T(-25, 120), T(70, 180), S(120), T(80, 200)],
    profile: [[0, 42], [0.3, 46], [0.55, 58], [0.75, 50], [1, 42]], lake: 'inside', fuji: -0.9 },
  { id: 3, name: 'Les lacets d’Irohazaka', blurb: 'Quatre épingles pour grimper, puis une longue descente : freine, dérape, recommence.',
    cmds: [A(180), T(90, 70), S(160), T(90, 45), S(180), ...hairL(), S(180), ...hairR(), S(180), ...hairL(), S(180), ...hairR(), S(260), T(90, 90), A(400), T(90, 120)],
    profile: [[0, 42], [0.12, 46], [0.62, 104], [0.7, 104], [1, 42]], lake: 'outside', fuji: -0.6 },
  { id: 4, name: 'La route des érables', blurb: 'Des enchaînements gauche-droite sous les érables : tout est dans le rythme.',
    cmds: [A(240), T(60, 90), T(-60, 90), T(90, 60), A(120), T(45, 70), T(-45, 70), T(45, 70), T(-45, 70), T(90, 70), S(200), T(60, 50), T(-30, 80), T(60, 60), S(160), T(-40, 70), T(80, 60), T(-20, 140), S(150), T(70, 90)],
    profile: [[0, 44], [0.25, 52], [0.5, 64], [0.7, 58], [1, 44]], lake: 'outside', fuji: -0.4 },
  { id: 5, name: 'Les rizières', blurb: 'Plat comme une rizière, des angles droits et deux longues lignes droites pour le turbo.',
    cmds: [A(420), T(90, 30), A(160), T(90, 28), S(120), T(-90, 26), S(140), T(90, 26), S(380), T(90, 30), S(200), T(-90, 30), S(100), T(90, 26), S(160), T(90, 30)],
    profile: [[0, 41], [0.5, 43], [1, 41]], lake: 'outside', fuji: -0.7 },
  { id: 6, name: 'Le col de Hakone', blurb: 'La grande montée : des virages amples jusqu’au col, et la descente en roue libre.',
    cmds: [A(300), T(50, 180), S(200), T(70, 120), S(160), T(-60, 100), T(80, 80), S(180), T(-70, 90), T(90, 60), S(220), T(60, 140), S(260), T(-40, 160), T(90, 110), A(300), T(40, 200), T(50, 160)],
    profile: [[0, 42], [0.1, 46], [0.5, 112], [0.6, 116], [0.92, 48], [1, 42]], lake: 'outside', fuji: -0.5 },
  { id: 7, name: 'Le serpent de Shirakawa', blurb: 'Un long slalom entre les fermes : la route ne s’arrête jamais de tourner.',
    cmds: [S(150), T(90, 60), A(80), ...slalom(5, 60, 45), S(60), T(90, 60), A(160), T(90, 60), S(300), T(-40, 120), T(40, 120), S(200), T(90, 60)],
    profile: [[0, 44], [0.25, 50], [0.5, 56], [0.75, 50], [1, 44]], lake: 'outside', fuji: -0.8 },
  { id: 8, name: 'L’anneau des lanternes', blurb: 'Court et rapide : deux lignes droites, deux grands virages, une chicane. Chaque centième compte.',
    cmds: [A(500), T(90, 70), A(60), T(90, 70), S(160), T(-35, 40), T(35, 40), S(160), T(90, 70), S(60), T(90, 70)],
    profile: [[0, 42], [0.5, 46], [1, 42]], lake: 'outside', fuji: -0.3 },
  { id: 9, name: 'La corniche d’Izu', blurb: 'Au bord de l’eau à pleine vitesse, puis la colline et ses virages en aveugle.',
    cmds: [A(380), T(30, 300), S(220), T(60, 150), T(70, 60), S(120), T(-80, 45), T(100, 40), S(140), T(-60, 60), T(90, 55), S(160), T(70, 90), A(260), T(10, 200), T(70, 160)],
    profile: [[0, 42], [0.25, 46], [0.5, 74], [0.62, 84], [0.85, 56], [1, 42]], lake: 'left', fuji: -0.3 },
  { id: 10, name: 'Le temple de Nikko', blurb: 'Tout autour de la colline du temple : des virages serrés, des bosses et peu de répit.',
    cmds: [A(200), T(90, 35), S(100), T(-90, 30), S(120), T(120, 32), S(90), T(-60, 40), T(100, 36), A(140), T(80, 34), S(110), T(-100, 30), T(110, 34), S(160), T(90, 40), S(100), T(-60, 50), T(70, 45), S(90), T(10, 60)],
    profile: [[0, 50], [0.2, 64], [0.4, 82], [0.55, 90], [0.75, 70], [1, 50]], lake: 'outside', fuji: -0.6 },
  { id: 11, name: 'Les mille torii', blurb: 'Une allée de portiques vermillon à traverser plein gaz, au milieu d’un tracé tout en finesse.',
    cmds: [S(300), T(40, 300), S(120), T(80, 80), S(140), T(-50, 70), T(90, 50), S(180), T(60, 70), T(-40, 90), A(120), T(100, 60), A(200), T(-30, 120), T(100, 90), S(140), T(10, 160)],
    profile: [[0, 44], [0.3, 52], [0.6, 66], [0.8, 56], [1, 44]], lake: 'outside', fuji: -0.5, torii: [24, 260] }
];
