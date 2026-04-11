import { useEffect, useMemo, useState } from 'react';

type RoundRecord = {
  id: string;
  date: string;
  holes: number;
  total: number;
  course: string;
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
  const [courses] = useState<string[]>([
    'Bellevue Golf Course',
    'Coyote Creek',
    "Eagle's Talon",
    'Heron Links',
    'Mini Golf Park',
    'Backyard Course',
    'Driving Range'
  ]);
  const [selectedCourse, setSelectedCourse] = useState<string>('Bellevue Golf Course');
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

  const saveRound = () => {
    const record: RoundRecord = {
      id: `${Date.now()}`,
      date: formatDate(new Date()),
      holes: holeCount,
      total: totalScore,
      course: selectedCourse,
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
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid #dbeafe' }}
            >
              {courses.map((course) => (
                <option key={course} value={course}>{course}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '18px' }}>
            <strong>🎯 Current total:</strong> {totalScore}
          </div>
        </div>
      </header>

      <section className="panel">
        <h2>🎮 Score your round</h2>
        <p className="subtext">Tap + or - to update each hole quickly while you play.</p>

        <div className="hole-grid">
          {scores.map((score, index) => {
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
                <strong>📅 {round.date} at {round.course}</strong>
                <div>{round.holes} holes • Total score {round.total} 🏌️</div>
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
