// Données du jeu : cannes, appâts, seaux, spots et poissons.
// Tout l'équilibrage se fait ici.

window.GAME_DATA = {
  rarities: {
    commun:  { label: 'Commun',      weight: 60, color: '#8fbfa0' },
    peu:     { label: 'Peu commun',  weight: 25, color: '#6fa8dc' },
    rare:    { label: 'Rare',        weight: 10, color: '#a98be0' },
    epique:  { label: 'Épique',      weight: 4,  color: '#f2a65a' },
    legende: { label: 'Légendaire',  weight: 1,  color: '#f06292' },
  },

  // max = poids max confortable (kg), power = vitesse de moulinage,
  // ctrl = largeur de la zone verte, range = portée du lancer
  rods: [
    { id: 'r1', name: 'Bâton & Ficelle', cost: 0, max: 3, power: 1.0, ctrl: 0.26, range: 0.6, color: '#c9a27e',
      desc: "Trouvé dans un buisson. Sent légèrement le chien." },
    { id: 'r2', name: 'Canne en Bambou du Grenier', cost: 120, max: 8, power: 1.2, ctrl: 0.28, range: 0.75, color: '#e8d27a',
      desc: "A appartenu à quelqu'un. Probablement un panda." },
    { id: 'r3', name: 'Canne Carbone Pro Max Ultra+', cost: 800, max: 25, power: 1.45, ctrl: 0.30, range: 0.9, color: '#5c6bc0',
      desc: "Le « + » coûte 300 pièces à lui tout seul." },
    { id: 'r4', name: 'Canne Télescopique Spatiale', cost: 4500, max: 80, power: 1.75, ctrl: 0.32, range: 1.0, color: '#4dd0e1',
      desc: "Testée par la NASA. Enfin, par un stagiaire de la NASA." },
    { id: 'r5', name: 'Harpon Diplomatique', cost: 22000, max: 300, power: 2.1, ctrl: 0.34, range: 1.1, color: '#ef7a7a',
      desc: "Négocie avec les poissons avant de les sortir de l'eau." },
    { id: 'r6', name: 'La Canne Légendaire de Mamie', cost: 100000, max: 2000, power: 2.6, ctrl: 0.38, range: 1.2, color: '#ba68c8',
      desc: "Forgée dans un volcan, entre deux pulls tricotés." },
  ],

  // rare = multiplicateur de chance (hors communs), speed = vitesse de touche
  baits: [
    { id: 'b0', name: 'Mie de Pain Rassis', cost: 0, rare: 1, speed: 1,
      desc: "Gratuite et illimitée. Comme ta patience, au début." },
    { id: 'b1', name: 'Ver de Terre Motivé', cost: 30, rare: 1.4, speed: 1.3,
      desc: "Il a fait un stage de développement personnel." },
    { id: 'b2', name: 'Croquettes du Chat', cost: 150, rare: 2, speed: 1.5,
      desc: "Le chat n'est pas au courant. Ne lui dis rien." },
    { id: 'b3', name: 'Fromage Qui Pue', cost: 700, rare: 3, speed: 1.8,
      desc: "Les poissons le sentent à 3 km. Les voisins aussi." },
    { id: 'b4', name: 'Appât Quantique', cost: 3500, rare: 5, speed: 2.2,
      desc: "Existe et n'existe pas. Fonctionne quand même." },
  ],
  baitPack: 10,

  buckets: [
    { name: 'Seau Percé (réparé au scotch)', cap: 6, cost: 0 },
    { name: 'Seau Honnête', cap: 12, cost: 100 },
    { name: 'Glacière de Camping', cap: 25, cost: 700 },
    { name: 'Baignoire à Roulettes', cap: 50, cost: 4000 },
    { name: 'Piscine Gonflable Portative', cap: 100, cost: 20000 },
  ],

  // fish: [id, nom, rareté, [poidsMin, poidsMax], prix/kg, combativité, couleur, description, junk?]
  spots: [
    {
      id: 's1', name: "L'Étang de Tonton Gérard", cost: 0, rodHint: 3,
      desc: "Un étang paisible. Tonton Gérard y a perdu son dentier en 1994.",
      pal: { skyTop: '#9fd3ec', skyBottom: '#e9f6f3', fog: '#e3f3f1', water: '#86cfc9', ground: '#b9e0a5', tree: '#8cc79a', tree2: '#f4b6c2', trunk: '#c9a27e', hills: '#a9d6b4', sun: '#fff4d6' },
      deco: 'etang',
      fish: [
        ['gardon', 'Gardon Blasé', 'commun', [0.1, 0.6], 12, 0.6, '#c9d6df', "A déjà tout vu. Surtout toi."],
        ['botte', 'Botte Orpheline', 'commun', [0.4, 0.9], 3, 0.3, '#8d6e63', "Cherche sa jumelle depuis 1987.", true],
        ['perche', 'Perche Arrogante', 'peu', [0.3, 1.5], 15, 1.0, '#b5d99c', "Se croit au sommet de la chaîne alimentaire."],
        ['rouge', 'Poisson Rouge Évadé', 'rare', [0.05, 0.3], 120, 0.8, '#ff8a65', "S'est échappé d'un bocal. Recherché dans 3 départements."],
        ['carpe', 'Carpe Dépressive', 'epique', [1.5, 4], 25, 1.2, '#d4b483', "Écrit des poèmes tristes au fond de l'étang."],
        ['dentier', 'Le Dentier de Tonton Gérard', 'legende', [0.1, 0.2], 3000, 1.5, '#fff8e1', "Tonton le cherchait. Enfin… il cherchait quelque chose.", true],
      ],
    },
    {
      id: 's2', name: 'Le Lac des Regrets', cost: 400, rodHint: 8,
      desc: "Brumeux, mélancolique. Chaque vague murmure « t'aurais dû prendre la glacière ».",
      pal: { skyTop: '#b6addf', skyBottom: '#e6e2f3', fog: '#dcd7ee', water: '#8ea6d8', ground: '#aebdcc', tree: '#9a8fc4', tree2: '#c6b8e8', trunk: '#8f8296', hills: '#b3b0d6', sun: '#f3eaff' },
      deco: 'regrets',
      fish: [
        ['chaussette', 'Chaussette Solitaire', 'commun', [0.1, 0.3], 20, 0.4, '#e57373', "L'autre est partie avec une machine à laver.", true],
        ['truite', 'Truite en Burn-out', 'commun', [0.8, 3], 18, 0.8, '#a5b4c8', "Elle a juste besoin de vacances. Pas de toi."],
        ['brochet', 'Brochet Comptable', 'peu', [2, 7], 22, 1.1, '#9ccc65', "A calculé tes chances. Elles sont faibles."],
        ['anguille', 'Anguille Philosophe', 'rare', [1, 5], 60, 1.3, '#6d7f6a', "« Je glisse, donc je suis. »"],
        ['silure', 'Silure Moustachu', 'epique', [8, 25], 30, 1.5, '#5d6d7e', "Sa moustache a plus d'abonnés que toi."],
        ['lettre', 'La Lettre de ton Ex', 'legende', [0.01, 0.02], 400000, 1.6, '#fce4ec', "Elle s'excuse. Enfin, presque. Il y a une faute.", true],
      ],
    },
    {
      id: 's3', name: 'La Rivière Qui Parle', cost: 2500, rodHint: 25,
      desc: "Une rivière bavarde. Elle donne son avis sur ta technique. Sans qu'on lui demande.",
      pal: { skyTop: '#f7b997', skyBottom: '#fde9c9', fog: '#fbe3c8', water: '#7ec6bd', ground: '#e8d39f', tree: '#e8a87c', tree2: '#c5e1a5', trunk: '#a1887f', hills: '#e0b99a', sun: '#ffe0b2' },
      deco: 'riviere',
      fish: [
        ['galet', 'Galet Bavard', 'commun', [1, 3], 15, 0.5, '#bcaaa4', "Ne parle que de cailloux. Pendant des heures.", true],
        ['saumon', 'Saumon à Contre-courant', 'commun', [3, 10], 30, 1.1, '#ff8a80', "Refuse de suivre la foule. Par principe."],
        ['esturgeon', 'Esturgeon Snob', 'peu', [8, 25], 45, 1.3, '#90a4ae', "Ne mange que du caviar. Le sien. C'est gênant."],
        ['licorne', 'Truite Arc-en-Ciel Licorne', 'rare', [2, 6], 300, 1.4, '#f8bbd0', "Elle a une corne. Personne ne sait pourquoi."],
        ['castor', 'Castor Égaré en Costume', 'epique', [10, 20], 120, 1.6, '#8d6e63', "Il dit qu'il est attendu en réunion."],
        ['voix', 'La Voix de la Rivière', 'legende', [20, 40], 900, 1.9, '#80deea', "C'était elle qui parlait. Depuis le début."],
      ],
    },
    {
      id: 's4', name: "L'Océan de Gelée Framboise", cost: 12000, rodHint: 80,
      desc: "L'eau est rose, collante et sucrée. Les dentistes adorent cet endroit.",
      pal: { skyTop: '#ffc1d9', skyBottom: '#fff0f5', fog: '#ffe6ef', water: '#ff9fc0', ground: '#fff0c4', tree: '#a5e8d4', tree2: '#ffd180', trunk: '#d7b899', hills: '#ffd3e2', sun: '#fffde7' },
      deco: 'gelee',
      fish: [
        ['meduse', 'Méduse Fluo', 'commun', [2, 8], 50, 0.9, '#b388ff', "Brille dans le noir. Et en plein jour, par fierté."],
        ['thon', 'Thon Gélatineux', 'commun', [15, 50], 45, 1.2, '#ef9a9a', "Il tremblote quand on le regarde."],
        ['requin', 'Requin Végétarien', 'peu', [30, 90], 60, 1.5, '#b0bec5', "Il te demande si tu as du tofu."],
        ['espadon', 'Espadon Poète', 'rare', [40, 120], 110, 1.7, '#81d4fa', "Récite des alexandrins en pointant son nez."],
        ['baleine', 'Baleine Miniature', 'epique', [60, 150], 200, 1.8, '#7986cb', "Miniature pour une baleine. Pas pour toi."],
        ['cerise', 'La Cerise Géante du Fond', 'legende', [100, 250], 600, 2.0, '#e53950', "Celle qui manquait au gâteau de l'océan."],
      ],
    },
    {
      id: 's5', name: 'La Flaque Cosmique', cost: 60000, rodHint: 300,
      desc: "Une flaque au bout de l'univers. Le fond est à environ 14 milliards d'années.",
      pal: { skyTop: '#1e1a40', skyBottom: '#5a3f8a', fog: '#3a2d63', water: '#7766d6', ground: '#ffe08a', tree: '#80cbc4', tree2: '#ff8fb1', trunk: '#b39ddb', hills: '#4a3b7a', sun: '#d1c4e9' },
      deco: 'cosmique',
      fish: [
        ['poussiere', "Poussière d'Étoile en Conserve", 'commun', [5, 20], 150, 1.0, '#fff59d', "Date de péremption : la fin des temps.", true],
        ['calamar', 'Calamar Quantique', 'commun', [50, 200], 90, 1.3, '#ce93d8', "Il est à la fois pêché et pas pêché."],
        ['lune', 'Poisson-Lune (le vrai)', 'peu', [200, 600], 100, 1.6, '#eceff1', "Les marées vont être bizarres ce soir."],
        ['comete', 'Comète Panée', 'rare', [100, 400], 250, 1.8, '#ffb74d', "Croustillante à l'extérieur, brûlante à l'intérieur."],
        ['kevin', 'Kevin, Dieu des Poissons', 'epique', [500, 1200], 400, 2.0, '#4fc3f7', "Il voulait juste un selfie."],
        ['final', 'Le Poisson Final', 'legende', [1000, 1900], 1000, 2.3, '#ffd54f', "Bravo. Il n'y a rien après. …Ou si ?"],
      ],
    },
  ],

  quips: {
    welcome: [
      "Bienvenue, pêcheur·se. Voici un étang. Voici un bâton. Débrouille-toi.",
    ],
    cast: [
      "Lancer magnifique. Enfin… correct.",
      "Le bouchon s'envole tel un rêve brisé.",
      "Les poissons ont vu ça. Ils jugent.",
      "Belle trajectoire. La physique est impressionnée.",
      "Plouf. C'est le bruit de l'espoir.",
    ],
    shortCast: [
      "Ce lancer a la portée d'un éternuement.",
      "Tu viens de pêcher… ton propre ponton.",
    ],
    wait: [
      "Le chat soupire.",
      "Quelque part, un poisson réfléchit à sa vie.",
      "Le vent souffle. Ou c'est le chat.",
      "Patience. Les poissons ont des agendas chargés.",
      "Un nuage passe. Il ne pêche pas, lui.",
      "Le bouchon flotte. C'est tout ce qu'il sait faire.",
    ],
    nibble: [
      "Hmm ? Non, rien. Fausse alerte.",
      "Un poisson a touché. Puis il a eu des doutes.",
    ],
    miss: [
      "Trop lent ! Le poisson a eu le temps de lire les CGU.",
      "Raté. Le poisson te fait un doigt d'honneur. Avec sa nageoire.",
      "Le poisson est reparti. Il te laisse un avis 1 étoile.",
    ],
    snap: [
      "CRAC ! La ligne a démissionné.",
      "La ligne a cassé. Elle était à bout. Littéralement.",
      "Tu as tiré trop fort. Le poisson garde le bouchon en souvenir.",
    ],
    escape: [
      "Le poisson s'est enfui. Il ne t'aimait pas vraiment.",
      "Évasion réussie. Le poisson va en faire un podcast.",
      "Il est parti. Ne le prends pas personnellement. (C'était personnel.)",
    ],
    tooHeavy: [
      "⚠️ Ce poisson pèse plus lourd que ta canne n'ose l'imaginer.",
      "⚠️ Ta canne tremble. Pas de froid.",
    ],
    catch: {
      commun: ["Un poisson ! Enfin, une chose.", "Prise honnête. Le chat est modérément impressionné.", "Ça compte. Techniquement."],
      peu: ["Pas mal ! Le chat lève un sourcil.", "Une prise peu commune pour une personne peu commune."],
      rare: ["RARE ! Le chat a failli applaudir.", "Wow. Même l'étang est surpris."],
      epique: ["ÉPIQUE ! Des violons jouent quelque part.", "Le chat a lâché son masque d'indifférence. Une seconde."],
      legende: ["LÉGENDAIRE !!! Le narrateur en perd ses mots. …", "Des bardes chanteront cette prise. Mal, mais ils chanteront."],
    },
    junk: ["Ce n'est pas un poisson. Mais ça se vend.", "Ah. Bon. Ça compte quand même ?"],
    full: [
      "Ton seau est plein. Même le chat est gêné pour toi.",
      "Plus de place dans le seau. Va vendre ta marchandise, magnat du poisson.",
    ],
    sell: [
      "Josiane la poissonnière compte les pièces avec ses dents.",
      "Vendu ! Josiane ne pose pas de questions.",
      "Ka-ching. L'économie locale te remercie.",
    ],
    buy: [
      "Achat effectué. Ton porte-monnaie pleure en silence.",
      "Excellent investissement. Probablement.",
      "Le vendeur te fait un clin d'œil. Inquiétant.",
    ],
    poor: [
      "Tu n'as pas assez de pièces. Essaie de pêcher, c'est le concept.",
      "Fonds insuffisants. Le chat ne te prêtera rien.",
    ],
    travel: [
      "Tu voyages. Le chat te suit, en râlant.",
      "Nouveau décor, nouveaux poissons, mêmes problèmes.",
    ],
    cat: [
      "Le chat te regarde. Il pense que tu tiens mal la canne.",
      "Le chat bâille. C'est une critique.",
      "Le chat lèche sa patte. Il a l'air plus occupé que toi.",
      "Le chat cligne lentement des yeux. Soit il t'aime, soit il te plaint.",
    ],
  },
};
