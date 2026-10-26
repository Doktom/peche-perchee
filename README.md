# Pêche Perchée — V4 « Loutres de Mer, Chefs, Fermières & Capitaines »

Jeu de pêche 3D low-poly, couleurs pastel, humour perché. Tu incarnes **Loutrec**, une loutre de mer personnifiée, accompagnée de **Roger**, son caillou préféré (avec des yeux).
Three.js r128 via CDN, aucun build. **Lancer :** double-clic sur `index.html` (internet requis pour Three.js et la police).

## Commandes
- **Maintenir clic gauche / Espace** : charger le lancer, relâcher pour lancer. Vise les **ombres sous l'eau**. **« ! »** : cliquer vite pour ferrer. **Moulinage** : maintenir = tension qui monte, garder l'aiguille dans le vert.
- **Caméra (clic droit)** : glisser = tourner · Maj + clic droit (ou clic molette) = déplacer · molette = zoom · clic droit simple ou **R** = recentrer.
- **Menu** : bouton **☰** ou touche **Échap** (sauvegardes, options, nouvelle partie).
- Clic sur les PNJ et objets 3D : La Josiane, Jean-Michmich, Coco, Marguerite, Chef Gaston, Tonton Gérard, Brandon, Tata Capucine, la cuisine flottante, le potager, Roger, l'aquarium, les bouteilles, la mouette…

## Départ minimaliste (V4)
On commence avec **une canne simple** (et de la mie de pain), 3 places dans les poches, rien d'autre : pas de moulinet (tu tires à la main), pas d'hameçon, pas d'épuisette, pas de cuisine, pas de potager, pas de bateau. **Tout s'achète et se débloque** — moulinet, fil, hameçon, épuisette, seau, etc. chez Jean-Michmich.

## Menu et sauvegardes (V4)
- Sauvegarde automatique toutes les 10 s (dans le navigateur).
- **3 emplacements** de sauvegarde / chargement, **export et import** par fichier, **sauvegarde rapide**, **nouvelle partie** (☰ ou Échap).
- Les anciennes parties sont converties automatiquement (seau, niveaux, cuisine, bateau).

## Commandes de clients (V4)
Chaque commande a un **minuteur** et se **renouvelle toute seule** quand il expire. Bouton **🔄 Actualiser** (recharge tout, avec 40 s de délai entre deux usages). Poissons *et* plats.

## Cuisine : tout se débloque (V4)
1. **Marguerite** (🧺 Marché) : ingrédients (prix variables, promo du jour, certains ingrédients seulement dans certains coins) et **matériel** : réchauds, appareils (poêle, marmite, gril, four, fumoir, mixeur, siphon), couteaux, **ustensiles** (écailleur, planche, bol & fouet, mortier, rouleau).
2. **Chef Gaston** : **7 techniques** (Écailler, Vider, Cuire, Fileter, Assaisonner, Mariner, Pâtisserie salée) qui demandent du matériel et un niveau, puis **24 recettes** qui demandent leurs techniques.
3. **La cuisine flottante** : un *guide du chef* te dit ce qui manque pour ton premier plat. Qualité 1 à 5 ★, cuisson en temps réel, plats à vendre (menu du jour ×2), à livrer ou à manger pour des bonus.

## Potager (V4) 🌱
**Tata Capucine** et son potager flottant : jusqu'à **8 parcelles**, **18 cultures** (persil, oignon, sel, blé, piment, algues, citronnier, riz, poules, olivier, champignons, safran, truffier…) qui donnent des **ingrédients de cuisine**. Il faut arroser (arrosoir de 4 niveaux, ou attendre la pluie), on peut mettre du **poisson en engrais** (pousse plus vite, récolte en plus), acheter une **serre** et un **épouvantail** (sinon Gégé la Mouette pille les récoltes). Niveau de potager à faire monter, la pousse continue même hors ligne (30 min max).

## Bateaux et zones de pêche (V4) ⛵
4 bateaux de tailles différentes (licorne gonflable, barque, chaloupe, chalutier rose) donnent accès à 4 zones : **Le Large, La Haute Mer, Les Grands Fonds, Les Abysses**. Poissons plus lourds et plus rares, et **20 espèces exclusives** (4 par coin). Bouton ⚓ en bas à gauche pour changer de zone.

## RPG
Niveaux de pêche (30) et de cuisine (20), 14 compétences, équipement spécifique (hameçons, épuisettes, 10 accessoires, 3 cannes spécialisées, 3 appâts spécialisés), niveaux requis pour le matériel et les zones.

## Poissons LSD 🌈
5 poissons psychédéliques : les manger donne un voyage (couleurs, poissons volants, fausses ombres, fausses touches…). Option « Voyages en douceur ».

## Graphismes (V4)
Palettes plus saturées, fanions colorés, fleurs, nénuphars, papillons, poissons qui sautent, éclats sur l'eau, halo du soleil, reflets de couleurs sur l'eau, **moins de pluie** (et plus courte).

## Contenu
**70 poissons** (5 coins × 14) · **52 succès** · 24 recettes · 18 cultures · 9 cannes, 9 appâts, 10 accessoires · 33 cosmétiques · PNJ : La Josiane, Jean-Michmich, Coco, Marguerite, Chef Gaston, Tata Capucine, Tonton Gérard, Brandon, le Marchand Louche, Gégé la Mouette.

## Fichiers
- `js/data.js` (base) · `js/data2.js` (RPG, cuisine, techniques, potager, bateaux, zones) · `js/audio.js` · `js/models.js` · `js/world.js` · `js/ui.js` · `js/game.js`
- `v1-backup/` — la V1 d'origine

## Debug (console du navigateur)
`PP.money(10000)`, `PP.xp(5000,'fish'|'cook')`, `PP.ing(5)`, `PP.boat(4)`, `PP.farm()`, `PP.lsd()`, `PP.trip(3,300)`, `PP.time(0.75)`, `PP.weather('orage')`, `PP.merchant()`, `PP.bottle()`, `PP.school()`, `PP.gull()`
