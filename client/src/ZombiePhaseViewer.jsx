const KIND_ICON = {
  spawn: "☠",
  abomination_extra: "☠",
  move: "➜",
  bite: "🩸",
  idle: "•",
};

// Rejoue la phase des zombies (spawn, déplacements, morsures) une étape à la
// fois : c'est le joueur qui clique "Suivant" pour avancer, pas le logiciel
// qui déroule tout seul.
export default function ZombiePhaseViewer({ steps, index, onNext }) {
  if (!steps || steps.length === 0) return null;
  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <div className="zombie-phase-overlay">
      <div className="zombie-phase-panel">
        <p className="zombie-phase-panel__title">Phase des zombies — étape {index + 1}/{steps.length}</p>
        <p className="zombie-phase-panel__step">
          <span className={`zombie-phase-icon zombie-phase-icon--${step.kind}`}>{KIND_ICON[step.kind] || "•"}</span>
          {step.message}
        </p>
        <button onClick={onNext}>{isLast ? "Terminer" : "Suivant"}</button>
      </div>
    </div>
  );
}
