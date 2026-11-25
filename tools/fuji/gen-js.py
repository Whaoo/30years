import json
d = json.load(open('circuits.json'))
orig = {"id": 1, "name": "Col du Fuji", "blurb": "La route du col au pied du Fuji, entre les érables rouges et les portiques vermillon : le circuit d’origine.",
        "cp": [[0, 0, 40], [230, -25, 42], [420, -5, 48], [540, 80, 58], [530, 200, 72], [420, 250, 88], [300, 310, 102], [330, 430, 116], [420, 520, 124], [360, 630, 120], [190, 650, 110], [40, 590, 98], [-120, 560, 90], [-280, 540, 84], [-330, 470, 80], [-200, 420, 74], [-90, 380, 70], [-100, 300, 64], [-260, 260, 58], [-320, 170, 52], [-250, 60, 46], [-130, 10, 42]],
        "fujiAz": 0.95, "center": [100, 320], "lake": {"x": 170, "z": -560, "r": 470, "level": 30}, "pagoda": [120, 330], "torii": None}
def fmt(c):
    cp = ','.join('[%s,%s,%s]' % (p[0], p[1], ('%g' % p[2])) for p in c['cp'])
    lk = c['lake']
    pg = 'null' if not c['pagoda'] else '[%d,%d]' % (round(c['pagoda'][0]), round(c['pagoda'][1]))
    to = 'null' if not c['torii'] else '[%d,%d]' % tuple(c['torii'])
    return ("    { id: %d, name: %s, blurb: %s,\n      fujiAz: %s, center: [%d, %d], lake: { x: %d, z: %d, r: %d, level: 30 }, pagoda: %s, torii: %s,\n      cp: [%s] }"
            % (c['id'], json.dumps(c['name'], ensure_ascii=False), json.dumps(c['blurb'], ensure_ascii=False), c['fujiAz'], c['center'][0], c['center'][1], lk['x'], lk['z'], lk['r'], pg, to, cp))
js = "  const CIRCUITS = [\n" + ',\n'.join(fmt(c) for c in [orig] + d) + "\n  ];\n"
open('circuits.js', 'w').write(js)
print(len(js), 'octets')
