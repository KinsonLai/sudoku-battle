import { getAllAchievements } from '../utils/achievements';

export default function Achievements({ newAchievements = [], onDismiss }) {
  const achievements = getAllAchievements();
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const unlockPercent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="achievements-container">
      {newAchievements.length > 0 && (
        <div className="achievements-popup">
          <h2 className="achievements-popup-title">Achievement Unlocked!</h2>
          <div className="achievements-popup-list">
            {newAchievements.map((ach) => (
              <div key={ach.id} className="achievement-new-card achievement-new-sparkle">
                <span className="achievement-new-icon">{ach.icon}</span>
                <div className="achievement-new-info">
                  <span className="achievement-new-name">{ach.name}</span>
                  <span className="achievement-new-desc">{ach.description}</span>
                </div>
                <span className="achievement-new-badge">New!</span>
              </div>
            ))}
          </div>
          <button className="achievements-dismiss-btn" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      )}

      <div className="achievements-header">
        <h2 className="achievements-title">Achievements</h2>
        <span className="achievements-count">
          {unlockedCount}/{totalCount} Unlocked
        </span>
      </div>

      <div className="achievements-progress-bar">
        <div
          className="achievements-progress-fill"
          style={{ width: `${unlockPercent}%` }}
        />
      </div>

      <div className="achievements-grid">
        {achievements.map((ach) => (
          <div
            key={ach.id}
            className={`achievement-card ${ach.unlocked ? 'achievement-unlocked' : 'achievement-locked'}`}
          >
            <span className="achievement-card-icon">
              {ach.unlocked ? ach.icon : '🔒'}
            </span>
            <span className="achievement-card-name">
              {ach.unlocked ? ach.name : '???'}
            </span>
            <span className="achievement-card-desc">
              {ach.unlocked ? ach.description : '???'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
