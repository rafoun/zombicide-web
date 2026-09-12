const EFFECT_LABEL = {
  heal: "Soigne 1 blessure (bouton dédié pendant ton tour)",
  open_door: "Force les portes verrouillées (clique dessus sur le plateau)",
};

function ItemStats({ card }) {
  if (card.type === "weapon") {
    return (
      <dl className="item-stats">
        <div><dt>Type</dt><dd>{card.mode === "ranged" ? "Distance" : "Mêlée"}</dd></div>
        {card.mode === "ranged" && (
          <div><dt>Portée</dt><dd>{card.range?.[0] ?? 0}-{card.range?.[1] ?? 0} zones</dd></div>
        )}
        <div><dt>Dés</dt><dd>{card.dice}</dd></div>
        <div><dt>Précision</dt><dd>{card.accuracy}+</dd></div>
        <div><dt>Dégâts</dt><dd>{card.damage}</dd></div>
      </dl>
    );
  }
  return (
    <dl className="item-stats">
      <div><dt>Effet</dt><dd>{EFFECT_LABEL[card.effect] || card.effect}</dd></div>
    </dl>
  );
}

export default function InventoryPanel({ equipment }) {
  return (
    <aside className="inventory-panel">
      <h2 className="inventory-panel__title">Inventaire</h2>
      {equipment.length === 0 ? (
        <p className="inventory-panel__empty">Rien pour l'instant. Fouille pour trouver du matériel.</p>
      ) : (
        <ul className="inventory-list">
          {equipment.map((card, i) => (
            <li key={i} className="inventory-item">
              <span className="inventory-item__name">{card.name}</span>
              <div className="item-tooltip">
                <p className="item-tooltip__description">{card.description}</p>
                <ItemStats card={card} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
