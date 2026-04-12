import { useEffect, useMemo, useState } from 'react';

type HoleData = {
  par: number;
  blue: number;
  white: number;
  red: number;
};

type Course = {
  name: string;
  holes: HoleData[];
};

type ShotBreakdown = {
  driver: number;
  fairway: number;
  iron: number;
  pitching: number;
  putting: number;
};

type HoleScore = {
  total: number;
  breakdown: ShotBreakdown;
};

type RoundRecord = {
  id: string;
  date: string;
  holes: number;
  total: number;
  course: string;
  tee: string;
  par: number;
  scores: HoleScore[]; // 改为详细的每洞得分
};

const defaultHoleCount = 9;

// Icon mappings
const shotIcons = {
  driver: '/icons/Driver.png',
  fairway: '/icons/Fairway.png',
  iron: '/icons/Iron.png',
  pitching: '/icons/Pitching.png',
  putting: '/icons/Putting.png',
  player: '/icons/Player.png',
  golfcourse: '/icons/GolfCourse.png',
  tee: '/icons/tee.png'
};

const createEmptyHoleScore = (): HoleScore => ({
  total: 0,
  breakdown: {
    driver: 0,
    fairway: 0,
    iron: 0,
    pitching: 0,
    putting: 0,
  },
});

const createEmptyScores = (count: number): HoleScore[] => 
  Array.from({ length: count }, () => createEmptyHoleScore());

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Fancy hole number display function
const getFancyHoleNumber = (holeIndex: number) => {
  const holeNumber = holeIndex + 1;
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
    '#AED6F1', '#A3E4D7', '#F9E79F'
  ];

  return {
    number: holeNumber,
    color: colors[holeIndex % colors.length],
    emoji: '⛳'
  };
};

function getPerformance(total: number, par: number): { label: string; emoji: string; color: string } {
  const diff = total - par;
  let label: string;
  let emoji: string;
  let color: string;
  
  if (diff === -3) {
    label = 'Albatross';
    emoji = '🦅';
    color = '#FFD700';
  } else if (diff === -2) {
    label = 'Eagle';
    emoji = '🦅';
    color = '#FFD700';
  } else if (diff === -1) {
    label = 'Birdie';
    emoji = '🐦';
    color = '#32CD32';
  } else if (diff === 0) {
    label = 'Par';
    emoji = '👍';
    color = '#4169E1';
  } else if (diff === 1) {
    label = 'Bogey';
    emoji = '😅';
    color = '#FFA500';
  } else if (diff === 2) {
    label = 'Double Bogey';
    emoji = '😰';
    color = '#FF6347';
  } else if (diff === 3) {
    label = 'Triple Bogey';
    emoji = '😱';
    color = '#DC143C';
  } else if (diff >= 4) {
    label = `${diff} Over Par`;
    emoji = '💀';
    color = '#8B0000';
  } else {
    label = `${Math.abs(diff)} Under Par`;
    emoji = '⭐';
    color = '#FFD700';
  }
  
  return { 
    label, 
    emoji, 
    color
  };
}

function App() {
  const [users, setUsers] = useState<string[]>(() => {
    const saved = window.localStorage.getItem('parkids-users');
    return saved ? JSON.parse(saved) : ['Kid 1', 'Kid 2'];
  });
  const [currentUser, setCurrentUser] = useState<string>('');
  const [newUserName, setNewUserName] = useState('');
const courses: Course[] = [
  {
    name: 'Bellevue Golf Course',
    holes: [
      { par: 4, blue: 377, white: 292, red: 265 },
      { par: 4, blue: 485, white: 293, red: 279 },
      { par: 3, blue: 147, white: 120, red: 105 },
      { par: 4, blue: 396, white: 292, red: 261 },
      { par: 4, blue: 485, white: 308, red: 290 },
      { par: 3, blue: 170, white: 131, red: 96 },
      { par: 5, blue: 340, white: 474, red: 436 },
      { par: 4, blue: 198, white: 360, red: 339 },
      { par: 5, blue: 341, white: 462, red: 438 },
      { par: 4, blue: 324, white: 292, red: 265 },
      { par: 4, blue: 326, white: 293, red: 279 },
      { par: 3, blue: 148, white: 120, red: 105 },
      { par: 4, blue: 306, white: 292, red: 261 },
      { par: 4, blue: 329, white: 308, red: 290 },
      { par: 3, blue: 159, white: 131, red: 96 },
      { par: 5, blue: 494, white: 474, red: 339 },
      { par: 4, blue: 395, white: 360, red: 236 },
      { par: 5, blue: 525, white: 462, red: 301 }
    ]
  },
  {
    name: "Eagle's Talon",
    holes: [
      { par: 4, blue: 386, white: 350, red: 278 },
      { par: 5, blue: 557, white: 520, red: 449 },
      { par: 4, blue: 368, white: 355, red: 288 },
      { par: 4, blue: 423, white: 397, red: 341 },
      { par: 4, blue: 449, white: 411, red: 343 },
      { par: 4, blue: 401, white: 357, red: 343 },
      { par: 3, blue: 178, white: 143, red: 111 },
      { par: 4, blue: 350, white: 319, red: 283 },
      { par: 3, blue: 169, white: 138, red: 98 },
      { par: 5, blue: 551, white: 521, red: 449 },
      { par: 5, blue: 482, white: 444, red: 400 },
      { par: 4, blue: 359, white: 325, red: 264 },
      { par: 4, blue: 376, white: 356, red: 299 },
      { par: 3, blue: 198, white: 171, red: 143 },
      { par: 4, blue: 441, white: 394, red: 336 },
      { par: 4, blue: 415, white: 383, red: 307 },
      { par: 3, blue: 174, white: 155, red: 117 },
      { par: 5, blue: 566, white: 555, red: 449 }
    ]
  },
  {
    name: 'Coyote Creek',
    holes: [
      { par: 4, blue: 365, white: 326, red: 301 },
      { par: 5, blue: 530, white: 499, red: 482 },
      { par: 4, blue: 398, white: 360, red: 336 },
      { par: 4, blue: 373, white: 344, red: 321 },
      { par: 3, blue: 183, white: 147, red: 116 },
      { par: 4, blue: 331, white: 308, red: 284 },
      { par: 4, blue: 306, white: 279, red: 279 },
      { par: 5, blue: 460, white: 436, red: 409 },
      { par: 3, blue: 135, white: 109, red: 109 },
      { par: 5, blue: 548, white: 506, red: 479 },
      { par: 4, blue: 379, white: 327, red: 323 },
      { par: 4, blue: 410, white: 388, red: 372 },
      { par: 3, blue: 150, white: 120, red: 85 },
      { par: 4, blue: 377, white: 324, red: 281 },
      { par: 4, blue: 436, white: 397, red: 355 },
      { par: 4, blue: 299, white: 278, red: 278 },
      { par: 3, blue: 165, white: 165, red: 146 },
      { par: 5, blue: 499, white: 483, red: 443 }
    ]
  },
  {
    name: 'Heron Links',
    holes: [
      { par: 4, blue: 86, white: 86, red: 86 },
      { par: 4, blue: 125, white: 125, red: 125 },
      { par: 4, blue: 95, white: 95, red: 95 },
      { par: 4, blue: 147, white: 147, red: 147 },
      { par: 4, blue: 98, white: 98, red: 98 },
      { par: 4, blue: 158, white: 158, red: 158 },
      { par: 4, blue: 170, white: 170, red: 170 },
      { par: 4, blue: 127, white: 127, red: 127 },
      { par: 4, blue: 101, white: 101, red: 101 }
    ]
  }
];
  const [selectedCourse, setSelectedCourse] = useState<Course>(courses[0]);
  const [selectedTee, setSelectedTee] = useState<'blue' | 'white' | 'red'>('white');
  const [holeCount, setHoleCount] = useState(defaultHoleCount);
  const [scores, setScores] = useState<HoleScore[]>(createEmptyScores(defaultHoleCount));
  const [history, setHistory] = useState<RoundRecord[]>([]);

  useEffect(() => {
    window.localStorage.setItem('parkids-users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      const savedHistory = window.localStorage.getItem(`parkids-history-${currentUser}`);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      } else {
        setHistory([]);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(`parkids-history-${currentUser}`, JSON.stringify(history));
    }
  }, [history, currentUser]);

  useEffect(() => {
    setScores(createEmptyScores(holeCount));
  }, [holeCount]);

  const totalScore = useMemo(() => scores.reduce((sum, score) => sum + score.total, 0), [scores]);
  const bestScore = useMemo(() => {
    if (history.length === 0) return null;
    return Math.min(...history.map((round) => round.total));
  }, [history]);
  const averageScore = useMemo(() => {
    if (history.length === 0) return null;
    return Math.round(history.reduce((sum, round) => sum + round.total, 0) / history.length);
  }, [history]);

  const updateShot = (holeIndex: number, shotType: keyof ShotBreakdown, delta: number) => {
    setScores((current) =>
      current.map((score, i) => {
        if (i === holeIndex) {
          const newBreakdown = {
            ...score.breakdown,
            [shotType]: Math.max(0, score.breakdown[shotType] + delta),
          };
          const newTotal = Object.values(newBreakdown).reduce((sum, val) => sum + val, 0);
          return {
            total: newTotal,
            breakdown: newBreakdown,
          };
        }
        return score;
      })
    );
  };

  const totalPar = useMemo(() => {
    return selectedCourse.holes.slice(0, holeCount).reduce((sum, hole) => sum + hole.par, 0);
  }, [selectedCourse, holeCount]);

  const saveRound = () => {
    const record: RoundRecord = {
      id: `${Date.now()}`,
      date: formatDate(new Date()),
      holes: holeCount,
      total: totalScore,
      course: selectedCourse.name,
      tee: selectedTee,
      par: totalPar,
      scores: scores.slice(0, holeCount), // 保存详细的每洞得分
    };
    setHistory((existing) => [record, ...existing].slice(0, 12));
  };

  const resetRound = () => {
    setScores(createEmptyScores(holeCount));
  };

  const addUser = () => {
    if (newUserName.trim() && !users.includes(newUserName.trim())) {
      setUsers((prev) => [...prev, newUserName.trim()]);
      setNewUserName('');
    }
  };

  const deleteUser = (userToDelete: string) => {
    if (users.length <= 1) {
      alert('Cannot delete the last golfer!');
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${userToDelete}"? This will also delete their game history.`)) {
      // Remove user from users list
      setUsers((prev) => prev.filter(user => user !== userToDelete));
      
      // Clear their localStorage data
      window.localStorage.removeItem(`parkids-history-${userToDelete}`);
      
      // If deleting current user, switch to another user
      if (currentUser === userToDelete) {
        const remainingUsers = users.filter(user => user !== userToDelete);
        setCurrentUser(remainingUsers[0] || '');
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="title-row">
            <span style={{ fontSize: '1.75rem' }}>⛳</span>
            <div>
              <h1>Parkids 🏌️‍♂️</h1>
              <p className="subtext">Select or add a golfer to start scoring. 🌳</p>
            </div>
          </div>
        </header>

        <section className="panel">
          <h2>Choose Golfer</h2>
          <div className="buttons-row">
            {users.map((user) => (
              <div key={user} className="player-button-container">
                <button
                  className="button player-button"
                  onClick={() => setCurrentUser(user)}
                >
                  <img src={shotIcons.player} alt="Player" className="button-icon" />
                  {user}
                </button>
                <button
                  className="delete-player-btn"
                  onClick={() => deleteUser(user)}
                  title={`Delete ${user}`}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px' }}>
            <input
              type="text"
              placeholder="New golfer name"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              style={{ padding: '10px', marginRight: '10px', borderRadius: '8px', border: '1px solid #dbeafe' }}
            />
            <button className="button secondary" onClick={addUser}>
              ➕ Add Golfer
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="title-row">
          <span style={{ fontSize: '1.75rem' }}>⛳</span>
          <div>
            <h1>Parkids</h1>
            <p className="subtext">Playing as {currentUser}. <button className="button secondary" style={{ fontSize: '0.8rem', padding: '4px 8px' }} onClick={() => setCurrentUser('')}>🔄 Switch Golfer</button></p>
          </div>
        </div>

        <div className="panel">
          <div className="buttons-row">
            {[9, 18].map((count) => (
              <button
                key={count}
                className={`toggle-button ${holeCount === count ? 'active' : ''}`}
                onClick={() => setHoleCount(count)}
              >
                {count} Holes
              </button>
            ))}
          </div>

          <div style={{ marginTop: '18px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
              <img src={shotIcons.golfcourse} alt="Course" className="label-icon" />
              Select Course:
            </label>
            <select
              value={selectedCourse.name}
              onChange={(e) => {
                const course = courses.find(c => c.name === e.target.value);
                if (course) setSelectedCourse(course);
              }}
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid #dbeafe', width: '100%' }}
            >
              {courses.map((course) => (
                <option key={course.name} value={course.name}>{course.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '18px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
              <span style={{ fontSize: '1.2rem' }}>⛳</span>
              Select Tee:
            </label>
            <div className="buttons-row">
              {(['blue', 'white', 'red'] as const).map((tee) => (
                <button
                  key={tee}
                  className={`toggle-button ${selectedTee === tee ? 'active' : ''}`}
                  onClick={() => setSelectedTee(tee)}
                >
                  {tee.charAt(0).toUpperCase() + tee.slice(1)} Tee
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '18px' }}>
            <strong>🎯 Current total:</strong> {totalScore} <small>(Par: {totalPar}, {totalScore - totalPar > 0 ? '+' : ''}{totalScore - totalPar})</small>
          </div>
        </div>
      </header>

      <section className="panel">
        <h2>🎮 Score your round</h2>
        <p className="subtext">Tap + or - to update each hole quickly while you play.</p>

        <div className="hole-grid">
          {scores.map((score, index) => {
            const holeData = selectedCourse.holes[index];
            const distance = holeData ? holeData[selectedTee] : 0;
            const par = holeData ? holeData.par : 3;
            const performance = getPerformance(score.total, par);
            const fancyHole = getFancyHoleNumber(index);
            return (
              <div key={index} className="hole-card">
                <div className="fancy-hole-header">
                  <div className="hole-number-circle" style={{ backgroundColor: fancyHole.color }}>
                    <span className="hole-icon-number">{fancyHole.emoji} {fancyHole.number}</span>
                  </div>
                  <div className="hole-details">
                    <div className="par-distance">Par {par} • {distance}yd</div>
                  </div>
                </div>
                <div className="performance-badge" style={{ 
                  backgroundColor: performance.color, 
                  color: 'white', 
                  padding: '8px', 
                  borderRadius: '12px', 
                  fontSize: '0.9rem', 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  margin: '8px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{performance.emoji}</span>
                  <span>{performance.label}</span>
                  {/* Optional: Uncomment when icons are downloaded
                  <img src={performance.icon} alt={performance.label} style={{ width: '20px', height: '20px' }} />
                  */}
                </div>
                
                <div className="shot-breakdown">
                  <div className="shot-row">
                    <div className="shot-label">
                      <img src={shotIcons.driver} alt="Driver" className="shot-icon" />
                      <span>Driver</span>
                    </div>
                    <div className="shot-controls">
                      <button className="shot-btn minus-btn" onClick={() => updateShot(index, 'driver', -1)}>-</button>
                      <span className="shot-count">{score.breakdown.driver}</span>
                      <button className="shot-btn plus-btn" onClick={() => updateShot(index, 'driver', 1)}>+</button>
                    </div>
                  </div>
                  
                  <div className="shot-row">
                    <div className="shot-label">
                      <img src={shotIcons.fairway} alt="Fairway" className="shot-icon" />
                      <span>Fairway</span>
                    </div>
                    <div className="shot-controls">
                      <button className="shot-btn minus-btn" onClick={() => updateShot(index, 'fairway', -1)}>-</button>
                      <span className="shot-count">{score.breakdown.fairway}</span>
                      <button className="shot-btn plus-btn" onClick={() => updateShot(index, 'fairway', 1)}>+</button>
                    </div>
                  </div>
                  
                  <div className="shot-row">
                    <div className="shot-label">
                      <img src={shotIcons.iron} alt="Iron" className="shot-icon" />
                      <span>Iron</span>
                    </div>
                    <div className="shot-controls">
                      <button className="shot-btn minus-btn" onClick={() => updateShot(index, 'iron', -1)}>-</button>
                      <span className="shot-count">{score.breakdown.iron}</span>
                      <button className="shot-btn plus-btn" onClick={() => updateShot(index, 'iron', 1)}>+</button>
                    </div>
                  </div>
                  
                  <div className="shot-row">
                    <div className="shot-label">
                      <img src={shotIcons.pitching} alt="Pitching" className="shot-icon" />
                      <span>Pitching</span>
                    </div>
                    <div className="shot-controls">
                      <button className="shot-btn minus-btn" onClick={() => updateShot(index, 'pitching', -1)}>-</button>
                      <span className="shot-count">{score.breakdown.pitching}</span>
                      <button className="shot-btn plus-btn" onClick={() => updateShot(index, 'pitching', 1)}>+</button>
                    </div>
                  </div>
                  
                  <div className="shot-row">
                    <div className="shot-label">
                      <img src={shotIcons.putting} alt="Putting" className="shot-icon" />
                      <span>Putting</span>
                    </div>
                    <div className="shot-controls">
                      <button className="shot-btn minus-btn" onClick={() => updateShot(index, 'putting', -1)}>-</button>
                      <span className="shot-count">{score.breakdown.putting}</span>
                      <button className="shot-btn plus-btn" onClick={() => updateShot(index, 'putting', 1)}>+</button>
                    </div>
                  </div>
                </div>
                
                <div className="score-display">Total: {score.total}</div>
              </div>
            );
          })}
        </div>

        <div className="round-actions" style={{ marginTop: '20px' }}>
          <button className="button" onClick={saveRound}>
            💾 Save round
          </button>
          <button className="button secondary" onClick={resetRound}>
            🔄 Reset scores
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>📈 Progress dashboard</h2>
        <div className="summary-list">
          <div className="summary-item">
            <strong>🏆 Best score</strong>
            {bestScore === null ? 'Play a round to see your best score.' : `${bestScore}`}
          </div>
          <div className="summary-item">
            <strong>📊 Average score</strong>
            {averageScore === null ? 'Save a few rounds to track progress.' : `${averageScore}`}
          </div>
          <div className="summary-item">
            <strong>🎮 Total rounds saved</strong>
            {history.length}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>📚 Saved rounds</h2>
        {history.length === 0 ? (
          <p className="subtext">No rounds saved yet. Tap "Save round" after you finish a game. 🎉</p>
        ) : (
          <div className="summary-list">
            {history.map((round) => {
              // 计算击球统计
              const totalShots = round.scores?.reduce((acc, hole) => {
                return {
                  driver: acc.driver + hole.breakdown.driver,
                  fairway: acc.fairway + hole.breakdown.fairway,
                  iron: acc.iron + hole.breakdown.iron,
                  pitching: acc.pitching + hole.breakdown.pitching,
                  putting: acc.putting + hole.breakdown.putting,
                };
              }, { driver: 0, fairway: 0, iron: 0, pitching: 0, putting: 0 }) || 
              { driver: 0, fairway: 0, iron: 0, pitching: 0, putting: 0 };
              
              return (
                <div key={round.id} className="history-item">
                  <strong>📅 {round.date} at {round.course} ({round.tee} tee)</strong>
                  <div>{round.holes} holes • Score {round.total} (Par {round.par}) • {round.total - round.par > 0 ? '+' : ''}{round.total - round.par} 🏌️</div>
                  <div style={{ fontSize: '0.8rem', marginTop: '4px', color: '#64748b' }}>
                    🏌️‍♂️{totalShots.driver} 🌳{totalShots.fairway} 🔨{totalShots.iron} 🎯{totalShots.pitching} ⛳{totalShots.putting}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer>
        Keep playing, practicing, and having fun. 🏌️‍♀️ ⛳ 🌳
      </footer>
    </div>
  );
}

export default App;
