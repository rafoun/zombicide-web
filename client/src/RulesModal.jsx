import { useState } from "react";

const SECTIONS = [
  {
    title: "Déroulement d'une manche",
    body: [
      "Chaque Survivant joue son tour dans l'ordre, puis vient la Phase des zombies (ils apparaissent et agissent), puis la manche suivante commence.",
      "Nombre d'Actions par tour : 3 de base, 4 dès que ton Adrénaline atteint le niveau Jaune (7 PA).",
      "Un Survivant mort ne joue plus — son tour est automatiquement sauté.",
    ],
  },
  {
    title: "Les Actions possibles",
    body: [
      "Se déplacer : vers une case adjacente (bloqué par les murs et les portes verrouillées).",
      "Attaquer (mêlée) : touche les zombies de ta propre case.",
      "Attaquer (à distance) : vise une zone dans la Portée de ton arme, en suivant les passages ouverts (pas besoin d'être parfaitement aligné).",
      "Fouiller : uniquement dans un bâtiment, sans zombie dans la zone, une fois par tour (sauf compétence contraire). Donne une carte équipement.",
      "Utiliser un objet : par exemple la Trousse de secours pour soigner 1 blessure.",
      "Forcer une porte verrouillée : clique dessus sur le plateau — il te faut un Pied de biche (ou la compétence Break-in).",
    ],
  },
  {
    title: "Combat",
    body: [
      "Chaque arme a des Dés, une Précision (le score minimum pour toucher) et des Dégâts.",
      "Chaque type de zombie demande un Dégât minimum pour être éliminé : Marcheur/Coureur = 1, Brute = 2, Abomination = 3. En dessous, l'attaque touche mais ne tue pas.",
      "Tir Ami : à distance, chaque dé raté peut blesser un allié présent dans la zone visée (jamais toi-même).",
    ],
  },
  {
    title: "Les zombies",
    body: [
      "4 types : Marcheur, Coureur (2 actions par activation), Brute (résistante), Abomination (très résistante, rare).",
      "Ils apparaissent aux Zones de Spawn à chaque Phase des zombies, en fonction du niveau de danger le plus haut parmi les Survivants vivants.",
      "Un écran récapitule les apparitions et les blessures subies à la fin de chaque manche.",
    ],
  },
  {
    title: "Personnages & Compétences",
    body: [
      "6 Survivants jouables, chacun avec 4 Compétences uniques.",
      "Elles se débloquent progressivement selon TON Adrénaline personnelle : Bleu (0 PA) → Jaune (7 PA) → Orange (19 PA) → Rouge (43 PA). Elles s'accumulent, aucune n'est jamais perdue.",
      "Tu gagnes de l'Adrénaline en éliminant des zombies (plus il est costaud, plus il en rapporte).",
    ],
  },
  {
    title: "Fin de partie",
    body: [
      "Victoire : remplis les objectifs du scénario, puis rejoins la Sortie avec les Survivants encore en vie.",
      "Défaite : tous les Survivants sont morts.",
    ],
  },
];

export default function RulesModal({ onClose }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="rules-overlay" onClick={onClose}>
      <div className="rules-panel" onClick={(e) => e.stopPropagation()}>
        <div className="rules-panel__header">
          <h2>Comment jouer</h2>
          <button className="button--secondary" onClick={onClose}>Fermer</button>
        </div>

        <div className="rules-list">
          {SECTIONS.map((section, i) => (
            <div key={section.title} className="rules-section">
              <button
                className="rules-section__toggle"
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
              >
                <span>{section.title}</span>
                <span className="rules-section__chevron">{openIndex === i ? "−" : "+"}</span>
              </button>
              {openIndex === i && (
                <ul className="rules-section__body">
                  {section.body.map((line, j) => <li key={j}>{line}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
