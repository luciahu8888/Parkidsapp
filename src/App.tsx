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

type RoundRecord = {
  id: string;
  date: string;
  holes: number;
  total: number;
  course: string;
  tee: string;
  par: number;
};

const defaultHoleCount = 9;
const createEmptyScores = (count: number) => Array.from({ length: count }, () => 3);

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
  const [scores, setScores] = useState<number[]>(createEmptyScores(defaultHoleCount));
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

  const totalScore = useMemo(() => scores.reduce((sum, value) => sum + value, 0), [scores]);
  const bestScore = useMemo(() => {
    if (history.length === 0) return null;
    return Math.min(...history.map((round) => round.total));
  }, [history]);
  const averageScore = useMemo(() => {
    if (history.length === 0) return null;
    return Math.round(history.reduce((sum, round) => sum + round.total, 0) / history.length);
  }, [history]);

  const updateScore = (index: number, delta: number) => {
    setScores((current) =>
      current.map((score, i) => (i === index ? Math.max(1, score + delta) : score))
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
              <button
                key={user}
                className="button"
                onClick={() => setCurrentUser(user)}
              >
                👤 {user}
              </button>
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
            <label style={{ display: 'block', marginBottom: '8px' }}>🏌️ Select Course:</label>
            <select
              value={selectedCourse.name}
              onChange={(e) => {
                const course = courses.find(c => c.name === e.target.value);
                if (course) setSelectedCourse(course);
              }}
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid #dbeafe' }}
            >
              {courses.map((course) => (
                <option key={course.name} value={course.name}>{course.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '18px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>🎯 Select Tee:</label>
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
            const getEmoji = (s: number) => {
              if (s === 1) return '🏆';
              if (s === 2) return '🥈';
              if (s === 3) return '🥉';
              if (s <= 5) return '🎯';
              return '⛳';
            };
            return (
              <div key={index} className="hole-card">
                <h3>Hole {index + 1} {getEmoji(score)}</h3>
                <div className="hole-info">
                  <small>Par {par} • {distance}yd</small>
                </div>
                <div className="score-display">{score}</div>
                <div className="adjust-row">
                  <button onClick={() => updateScore(index, -1)} aria-label={`Reduce score for hole ${index + 1}`}>
                    ➖
                  </button>
                  <button onClick={() => updateScore(index, 1)} aria-label={`Increase score for hole ${index + 1}`}>
                    ➕
                  </button>
                </div>
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
            {history.map((round) => (
              <div key={round.id} className="history-item">
                <strong>📅 {round.date} at {round.course} ({round.tee} tee)</strong>
                <div>{round.holes} holes • Score {round.total} (Par {round.par}) • {round.total - round.par > 0 ? '+' : ''}{round.total - round.par} 🏌️</div>
              </div>
            ))}
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
