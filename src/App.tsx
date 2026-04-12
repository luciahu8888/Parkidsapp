import { useEffect, useMemo, useState } from 'react';
import { userService, courseService, roundService, migrationService, type User, type DBCourse, type Round, type DBHole } from './services/database';

type HoleData = {
  par: number;
  blue: number;
  white: number;
  red: number;
};

type Course = {
  id: string;
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
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserName, setNewUserName] = useState('');

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTee, setSelectedTee] = useState<'blue' | 'white' | 'red'>('white');
  const [holeCount, setHoleCount] = useState(defaultHoleCount);
  const [scores, setScores] = useState<HoleScore[]>(createEmptyScores(defaultHoleCount));
  const [history, setHistory] = useState<Round[]>([]);

  // Load initial data from Supabase
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // Load users
        const usersData = await userService.getAllUsers();
        setUsers(usersData);

        // Load courses
        const dbCourses: DBCourse[] = await courseService.getAllCourses();
        console.log('Loaded DB courses:', dbCourses);
        console.log('DB courses with holes:', dbCourses.map(c => ({ name: c.name, holesCount: c.holes.length })));

        // If no courses found, try to populate the database
        if (dbCourses.length === 0) {
          console.log('No courses found, attempting to populate database...');
          const populated = await migrationService.checkAndPopulateDatabase();
          console.log('Database population result:', populated);
          if (populated) {
            // Reload courses after population
            const newDbCourses = await courseService.getAllCourses();
            console.log('Courses after population:', newDbCourses.length);
            const coursesData: Course[] = newDbCourses.map(course => ({
              id: course.id,
              name: course.name,
              holes: course.holes.map((hole: DBHole) => ({
                par: hole.par,
                blue: hole.blue_distance,
                white: hole.white_distance,
                red: hole.red_distance
              }))
            }));
            console.log('Mapped courses after population:', coursesData.length);
            setCourses(coursesData);
          } else {
            console.error('Failed to populate database');
            setCourses([]);
          }
        } else {
          const coursesData: Course[] = dbCourses.map(course => ({
            id: course.id,
            name: course.name,
            holes: course.holes.map((hole: DBHole) => ({
              par: hole.par,
              blue: hole.blue_distance,
              white: hole.white_distance,
              red: hole.red_distance
            }))
          }));
          console.log('Mapped courses data:', coursesData);
          console.log('First course holes sample:', coursesData[0]?.holes?.slice(0, 3));
          setCourses(coursesData);
        }

        // Try to migrate localStorage data if users exist but no Supabase data
        if (usersData.length === 0) {
          const migrated = await migrationService.migrateLocalStorageToSupabase();
          if (migrated) {
            // Reload data after migration
            const newUsersData = await userService.getAllUsers();
            setUsers(newUsersData);
          }
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        // Fallback to localStorage if Supabase fails
        const localUsers = JSON.parse(localStorage.getItem('parkids-users') || '["Kid 1", "Kid 2"]');
        setUsers(localUsers.map((name: string) => ({ id: name, name, created_at: '', updated_at: '' })));
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Load user history when current user changes
  useEffect(() => {
    const loadUserHistory = async () => {
      if (currentUser) {
        try {
          const userRounds = await roundService.getUserRounds(currentUser.id);
          setHistory(userRounds);
        } catch (error) {
          console.error('Error loading user history:', error);
          setHistory([]);
        }
      } else {
        setHistory([]);
      }
    };

    loadUserHistory();
  }, [currentUser]);

  useEffect(() => {
    setScores(createEmptyScores(holeCount));
  }, [holeCount]);

  const totalScore = useMemo(() => scores.reduce((sum, score) => sum + score.total, 0), [scores]);
  const bestScore = useMemo(() => {
    if (history.length === 0) return null;
    return Math.min(...history.map((round) => round.total_score));
  }, [history]);
  const averageScore = useMemo(() => {
    if (history.length === 0) return null;
    return Math.round(history.reduce((sum, round) => sum + round.total_score, 0) / history.length);
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
    return selectedCourse ? selectedCourse.holes.slice(0, holeCount).reduce((sum, hole) => sum + hole.par, 0) : 0;
  }, [selectedCourse, holeCount]);

  const saveRound = async () => {
    if (!currentUser || !selectedCourse) return;

    try {
      const roundData = {
        user_id: currentUser.id,
        course_id: selectedCourse.id,
        tee_color: selectedTee,
        hole_count: holeCount,
        total_score: totalScore,
        total_par: totalPar,
        date_played: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        hole_scores: scores.slice(0, holeCount).map((score, index) => ({
          hole_number: index + 1,
          total_shots: score.total,
          driver_shots: score.breakdown.driver,
          fairway_shots: score.breakdown.fairway,
          iron_shots: score.breakdown.iron,
          pitching_shots: score.breakdown.pitching,
          putting_shots: score.breakdown.putting
        }))
      };

      await roundService.saveRound(roundData);

      // Reload history to get the updated data
      const userRounds = await roundService.getUserRounds(currentUser.id);
      setHistory(userRounds);

      // Reset scores for next round
      setScores(createEmptyScores(holeCount));
    } catch (error) {
      console.error('Error saving round:', error);
      alert('Failed to save round. Please try again.');
    }
  };

  const resetRound = () => {
    setScores(createEmptyScores(holeCount));
  };

  const addUser = async () => {
    if (newUserName.trim() && !users.some(user => user.name === newUserName.trim())) {
      try {
        const newUser = await userService.createUser(newUserName.trim());
        setUsers((prev) => [...prev, newUser]);
        setNewUserName('');
      } catch (error) {
        console.error('Error creating user:', error);
        alert('Failed to create user. Please try again.');
      }
    }
  };

  const deleteUser = async (userToDelete: User) => {
    if (users.length <= 1) {
      alert('Cannot delete the last golfer!');
      return;
    }

    if (confirm(`Are you sure you want to delete "${userToDelete.name}"? This will also delete their game history.`)) {
      try {
        await userService.deleteUser(userToDelete.id);
        setUsers((prev) => prev.filter(user => user.id !== userToDelete.id));

        // If deleting current user, switch to another user
        if (currentUser?.id === userToDelete.id) {
          const remainingUsers = users.filter(user => user.id !== userToDelete.id);
          setCurrentUser(remainingUsers[0] || null);
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="app-shell">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <h2>⛳ Loading Parkids...</h2>
          <p>Please wait while we connect to the database.</p>
        </div>
      </div>
    );
  }

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
              <div key={user.id} className="player-button-container">
                <button
                  className="button player-button"
                  onClick={() => setCurrentUser(user)}
                >
                  <img src={shotIcons.player} alt="Player" className="button-icon" />
                  {user.name}
                </button>
                <button
                  className="delete-player-btn"
                  onClick={() => deleteUser(user)}
                  title={`Delete ${user.name}`}
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
            <p className="subtext">Playing as {currentUser?.name}. <button className="button secondary" style={{ fontSize: '0.8rem', padding: '4px 8px' }} onClick={() => setCurrentUser(null)}>🔄 Switch Golfer</button></p>
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
              Select Golf Course:
            </label>
            <select
              value={selectedCourse?.name || ''}
              onChange={(e) => {
                const course = courses.find(c => c.name === e.target.value);
                console.log('Selected Golf course:', course);
                console.log('Course holes:', course?.holes);
                if (course) setSelectedCourse(course);
              }}
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid #dbeafe', width: '100%' }}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.name}>{course.name}</option>
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
            const holeData = selectedCourse?.holes[index];
            console.log('Hole data for hole', index + 1, ':', holeData);
            const distance = holeData ? holeData[selectedTee] : 0;
            console.log('Selected tee:', selectedTee, 'Distance:', distance);
            const par = holeData ? holeData.par : 3;
            const performance = getPerformance(score.total, par);
            const fancyHole = getFancyHoleNumber(index);
            return (
              <div key={index} className="hole-card">
                {/* Hole Header */}
                <div className="hole-header">
                  <div className="hole-number-badge">
                    <span className="hole-emoji">{fancyHole.emoji}</span>
                    <span className="hole-number">{fancyHole.number}</span>
                  </div>
                  <div className="hole-info">
                    <div className="par-info">Par {par}</div>
                    <div className="distance-info">{distance}yd</div>
                  </div>
                </div>

                {/* Prominent Total Score */}
                <div className="total-score-display">
                  <div className="score-circle">
                    <span className="score-number">{score.total}</span>
                    <span className="score-label">Total</span>
                  </div>
                  <div className="score-vs-par">
                    {score.total - par > 0 && <span className="over-par">+{score.total - par}</span>}
                    {score.total - par === 0 && <span className="even-par">Even</span>}
                    {score.total - par < 0 && <span className="under-par">{score.total - par}</span>}
                  </div>
                </div>

                {/* Performance Badge */}
                <div className="performance-section">
                  <div className="performance-badge" style={{ 
                    backgroundColor: performance.color, 
                    color: 'white'
                  }}>
                    <span className="performance-emoji">{performance.emoji}</span>
                    <span className="performance-text">{performance.label}</span>
                  </div>
                </div>

                {/* Shot Breakdown */}
                <div className="shots-section">
                  <h4 className="shots-title">Shot Breakdown</h4>
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
            {history.map((round) => {
              // 计算击球统计
              const totalShots = round.hole_scores?.reduce((acc, hole) => {
                return {
                  driver: acc.driver + hole.driver_shots,
                  fairway: acc.fairway + hole.fairway_shots,
                  iron: acc.iron + hole.iron_shots,
                  pitching: acc.pitching + hole.pitching_shots,
                  putting: acc.putting + hole.putting_shots,
                };
              }, { driver: 0, fairway: 0, iron: 0, pitching: 0, putting: 0 }) ||
              { driver: 0, fairway: 0, iron: 0, pitching: 0, putting: 0 };

              return (
                <div key={round.id} className="history-item">
                  <strong>📅 {round.date_played} at {courses.find(c => c.id === round.course_id)?.name || 'Unknown Course'} ({round.tee_color} tee)</strong>
                  <div>{round.hole_count} holes • Score {round.total_score} (Par {round.total_par}) • {round.total_score - round.total_par > 0 ? '+' : ''}{round.total_score - round.total_par} 🏌️</div>
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
        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#64748b' }}>
          Created by luciaHu
        </div>
      </footer>
    </div>
  );
}

export default App;
