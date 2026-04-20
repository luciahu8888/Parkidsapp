import { useEffect, useMemo, useState } from 'react';
import { userService, courseService, roundService, migrationService, type User, type DBCourse, type Round, type DBHole, type NewCourseHole } from './services/database';
import { getAiAnalysis, type AiAnalysisRequest } from './services/aiService';

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

type RoundDraft = {
  scores: HoleScore[];
  savedHoleNumbers: number[];
  updatedAt: string;
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

const ownedUsersStorageKey = 'parkids-owned-user-ids';
const legacyUsersStorageKey = 'parkids-users';

function getOwnedUserIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ownedUsersStorageKey) || '[]');
  } catch {
    return [];
  }
}

function setOwnedUserIds(ids: string[]) {
  localStorage.setItem(ownedUsersStorageKey, JSON.stringify(Array.from(new Set(ids))));
}

function addOwnedUserId(userId: string) {
  setOwnedUserIds([...getOwnedUserIds(), userId]);
}

function removeOwnedUserId(userId: string) {
  setOwnedUserIds(getOwnedUserIds().filter((id) => id !== userId));
}

function filterUsersByOwnership(allUsers: User[]): User[] {
  const ownedIds = new Set(getOwnedUserIds());

  // One-time bootstrap from legacy local user names if ownership list is empty.
  if (ownedIds.size === 0) {
    try {
      const legacyNames = new Set<string>(JSON.parse(localStorage.getItem(legacyUsersStorageKey) || '[]'));
      const matchedIds = allUsers.filter((user) => legacyNames.has(user.name)).map((user) => user.id);
      if (matchedIds.length > 0) {
        setOwnedUserIds(matchedIds);
        matchedIds.forEach((id) => ownedIds.add(id));
      }
    } catch {
      // Ignore invalid legacy format and keep ownership empty.
    }
  }

  return allUsers.filter((user) => ownedIds.has(user.id));
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function mapDbCourseToCourse(course: DBCourse): Course {
  return {
    id: course.id,
    name: course.name,
    holes: course.holes.map((hole: DBHole) => ({
      par: hole.par,
      blue: hole.blue_distance,
      white: hole.white_distance,
      red: hole.red_distance,
    })),
  };
}

function buildCourseTemplate(holeCount: 9 | 18) {
  return Array.from({ length: holeCount }, (_, index) => `${index + 1},4,320,280,240`).join('\n');
}

function parseCourseImport(rawText: string): { holes: NewCourseHole[]; error?: string } {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { holes: [], error: 'Add hole data before saving the course.' };
  }

  if (lines.length !== 9 && lines.length !== 18) {
    return { holes: [], error: 'Import exactly 9 or 18 holes.' };
  }

  const holes: NewCourseHole[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const parts = lines[index]
      .split(/[\t,]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length !== 4 && parts.length !== 5) {
      return {
        holes: [],
        error: `Line ${index + 1} must be "hole,par,blue,white,red" or "par,blue,white,red".`,
      };
    }

    const values = parts.map((part) => Number(part));
    if (values.some((value) => Number.isNaN(value) || value <= 0 || !Number.isInteger(value))) {
      return { holes: [], error: `Line ${index + 1} must use positive whole numbers only.` };
    }

    const [holeNumber, par, blue, white, red] = parts.length === 5
      ? values
      : [index + 1, values[0], values[1], values[2], values[3]];

    if (holeNumber !== index + 1) {
      return { holes: [], error: `Hole numbers must run in order from 1 to ${lines.length}.` };
    }

    holes.push({ hole_number: holeNumber, par, blue, white, red });
  }

  return { holes };
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
  const [userNameError, setUserNameError] = useState('');
  const [showCourseManager, setShowCourseManager] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [courseImportText, setCourseImportText] = useState(buildCourseTemplate(9));
  const [courseImportError, setCourseImportError] = useState('');
  const [savingCourse, setSavingCourse] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedTee, setSelectedTee] = useState<'blue' | 'white' | 'red'>('white');
  const [holeCount, setHoleCount] = useState(defaultHoleCount);
  const [scores, setScores] = useState<HoleScore[]>(createEmptyScores(defaultHoleCount));
  const [savedHoleNumbers, setSavedHoleNumbers] = useState<number[]>([]);
  const [expandedHoles, setExpandedHoles] = useState<number[]>([]);
  const [history, setHistory] = useState<Round[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<{ currentRound: string; history: string }>({
    currentRound: 'AI insights will appear here after you start scoring.',
    history: 'Save rounds to get AI trend feedback.',
  });
  const [aiLoading, setAiLoading] = useState(false);

  const loadCourses = async () => {
    const dbCourses: DBCourse[] = await courseService.getAllCourses();
    console.log('Loaded DB courses:', dbCourses);
    console.log('DB courses with holes:', dbCourses.map(c => ({ name: c.name, holesCount: c.holes.length })));

    const coursesData: Course[] = dbCourses.map(mapDbCourseToCourse);
    console.log('Mapped courses data:', coursesData);
    console.log('First course holes sample:', coursesData[0]?.holes?.slice(0, 3));
    setCourses(coursesData);
    return coursesData;
  };

  // Load initial data from Supabase
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);

        // Load users
        const usersData = await userService.getAllUsers();
        setUsers(filterUsersByOwnership(usersData));

        // Always run migration so newly added courses are auto-filled for existing databases too.
        const migrationOk = await migrationService.checkAndPopulateDatabase();
        if (!migrationOk) {
          console.error('Course migration failed, loading available courses only.');
        }

        // Load courses after migration attempt
        await loadCourses();

        // Try to migrate localStorage data if users exist but no Supabase data
        if (usersData.length === 0) {
          const migrated = await migrationService.migrateLocalStorageToSupabase();
          if (migrated) {
            // Reload data after migration
            const newUsersData = await userService.getAllUsers();
            setUsers(filterUsersByOwnership(newUsersData));
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
    setSavedHoleNumbers([]);
    setExpandedHoles([]);
  }, [holeCount]);

  useEffect(() => {
    if (selectedCourse && holeCount > selectedCourse.holes.length) {
      setHoleCount(selectedCourse.holes.length);
    }
  }, [selectedCourse, holeCount]);

  const availableHoleCounts = useMemo(() => {
    if (!selectedCourse) return [9, 18];
    return selectedCourse.holes.length >= 18 ? [9, 18] : [selectedCourse.holes.length];
  }, [selectedCourse]);

  const draftStorageKey = useMemo(() => {
    if (!currentUser || !selectedCourse) return null;
    return `parkids-round-draft-${currentUser.id}-${selectedCourse.id}-${selectedTee}-${holeCount}`;
  }, [currentUser, selectedCourse, selectedTee, holeCount]);

  const saveDraft = (holeNumberToMark?: number) => {
    if (!draftStorageKey) return;

    const mergedSavedHoles = holeNumberToMark
      ? Array.from(new Set([...savedHoleNumbers, holeNumberToMark]))
      : savedHoleNumbers;

    const draft: RoundDraft = {
      scores,
      savedHoleNumbers: mergedSavedHoles,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    setSavedHoleNumbers(mergedSavedHoles);
  };

  useEffect(() => {
    if (!draftStorageKey) return;

    try {
      const rawDraft = localStorage.getItem(draftStorageKey);
      if (!rawDraft) {
        setScores(createEmptyScores(holeCount));
        setSavedHoleNumbers([]);
        setExpandedHoles([]);
        return;
      }

      const parsedDraft = JSON.parse(rawDraft) as RoundDraft;
      if (Array.isArray(parsedDraft.scores) && parsedDraft.scores.length === holeCount) {
        setScores(parsedDraft.scores);
      }

      if (Array.isArray(parsedDraft.savedHoleNumbers)) {
        setSavedHoleNumbers(parsedDraft.savedHoleNumbers);
      }
    } catch (error) {
      console.error('Failed to load round draft:', error);
      setScores(createEmptyScores(holeCount));
      setSavedHoleNumbers([]);
      setExpandedHoles([]);
    }
  }, [draftStorageKey, holeCount]);

  const switchGolfer = (user: User | null) => {
    setCurrentUser(user);
    setScores(createEmptyScores(holeCount));
    setSavedHoleNumbers([]);
    setExpandedHoles([]);
  };

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

  const toggleHoleExpanded = (holeIndex: number) => {
    setExpandedHoles((current) =>
      current.includes(holeIndex)
        ? current.filter((idx) => idx !== holeIndex)
        : [...current, holeIndex]
    );
  };

  const totalPar = useMemo(() => {
    return selectedCourse ? selectedCourse.holes.slice(0, holeCount).reduce((sum, hole) => sum + hole.par, 0) : 0;
  }, [selectedCourse, holeCount]);

  const aiRequestData = useMemo<AiAnalysisRequest>(() => ({
    courseName: selectedCourse?.name || 'Unknown course',
    teeColor: selectedTee,
    holeCount,
    totalScore,
    totalPar,
    holeSummaries: selectedCourse
      ? scores.slice(0, holeCount).map((score, index) => ({
          hole: index + 1,
          par: selectedCourse.holes[index].par,
          total: score.total,
          driver: score.breakdown.driver,
          fairway: score.breakdown.fairway,
          iron: score.breakdown.iron,
          pitching: score.breakdown.pitching,
          putting: score.breakdown.putting,
        }))
      : [],
    recentRounds: history.slice(-5).map((round) => ({
      date: round.date_played,
      total_score: round.total_score,
      total_par: round.total_par,
      hole_count: round.hole_count,
      score_diff: round.total_score - round.total_par,
    })),
  }), [selectedCourse, selectedTee, holeCount, totalScore, totalPar, scores, history]);

  useEffect(() => {
    if (!selectedCourse) {
      setAiAnalysis({
        currentRound: 'Select a course and start scoring to get AI-powered coaching.',
        history: 'AI history insights are available after you save at least one round.',
      });
      return;
    }

    let active = true;
    setAiLoading(true);

    getAiAnalysis(aiRequestData)
      .then((analysis) => {
        if (!active) return;
        setAiAnalysis(analysis);
      })
      .finally(() => {
        if (!active) return;
        setAiLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCourse, aiRequestData]);

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
      setSavedHoleNumbers([]);
      if (draftStorageKey) {
        localStorage.removeItem(draftStorageKey);
      }
    } catch (error) {
      console.error('Error saving round:', error);
      alert('Failed to save round. Please try again.');
    }
  };

  const resetRound = () => {
    setScores(createEmptyScores(holeCount));
    setSavedHoleNumbers([]);
    if (draftStorageKey) {
      localStorage.removeItem(draftStorageKey);
    }
  };

  const addUser = async () => {
    const trimmed = newUserName.trim();
    if (!trimmed) return;
    if (users.some(user => user.name.toLowerCase() === trimmed.toLowerCase())) {
      setUserNameError(`"${trimmed}" already exists. Please use a different name.`);
      return;
    }
    try {
      const newUser = await userService.createUser(trimmed);
      addOwnedUserId(newUser.id);
      setUsers((prev) => [...prev, newUser]);
      setNewUserName('');
      setUserNameError('');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user. Please try again.');
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
        removeOwnedUserId(userToDelete.id);
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

  const deleteSavedRound = async (roundId: string) => {
    if (!currentUser) return;

    const confirmed = confirm('Delete this saved round? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await roundService.deleteRound(roundId);
      const userRounds = await roundService.getUserRounds(currentUser.id);
      setHistory(userRounds);
    } catch (error) {
      console.error('Error deleting round:', error);
      alert('Failed to delete round. Please try again.');
    }
  };

  const saveCustomCourse = async () => {
    const trimmedName = newCourseName.trim();
    if (!trimmedName) {
      setCourseImportError('Enter a golf course name.');
      return;
    }

    if (courses.some((course) => course.name.toLowerCase() === trimmedName.toLowerCase())) {
      setCourseImportError(`"${trimmedName}" already exists. Use a different course name.`);
      return;
    }

    const parsed = parseCourseImport(courseImportText);
    if (parsed.error) {
      setCourseImportError(parsed.error);
      return;
    }

    try {
      setSavingCourse(true);
      setCourseImportError('');

      const createdCourse = await courseService.createCourse(trimmedName, parsed.holes);
      const mappedCourse = mapDbCourseToCourse(createdCourse);
      const updatedCourses = [...courses, mappedCourse].sort((a, b) => a.name.localeCompare(b.name));

      setCourses(updatedCourses);
      setSelectedCourse(mappedCourse);
      setHoleCount(parsed.holes.length === 18 ? 18 : 9);
      setShowCourseManager(false);
      setNewCourseName('');
      setCourseImportText(buildCourseTemplate(9));
    } catch (error) {
      console.error('Error creating course:', error);
      setCourseImportError('Failed to save the new course. Please try again.');
    } finally {
      setSavingCourse(false);
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
                  onClick={() => switchGolfer(user)}
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
              onChange={(e) => { setNewUserName(e.target.value); setUserNameError(''); }}
              style={{ padding: '10px', marginRight: '10px', borderRadius: '8px', border: userNameError ? '1px solid #ef4444' : '1px solid #dbeafe' }}
            />
            <button className="button secondary" onClick={addUser}>
              ➕ Add Golfer
            </button>
          </div>
          {userNameError && (
            <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '6px' }}>{userNameError}</p>
          )}
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
            <p className="subtext">Playing as {currentUser?.name}. <button className="button secondary" style={{ fontSize: '0.8rem', padding: '4px 8px' }} onClick={() => switchGolfer(null)}>🔄 Switch Golfer</button></p>
          </div>
        </div>

        <div className="panel">
          <div className="buttons-row">
            {availableHoleCounts.map((count) => (
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
            <div className="course-picker-row">
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
                <option value="" disabled>⛳ Choose your golf course...</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.name}>{course.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="button secondary course-manage-btn"
                onClick={() => {
                  setShowCourseManager((current) => !current);
                  setCourseImportError('');
                }}
              >
                {showCourseManager ? 'Close' : 'Add Course'}
              </button>
            </div>
            {showCourseManager ? (
              <div className="course-manager-card">
                <div className="course-manager-header">
                  <h3>Create Custom Course</h3>
                  <p>Paste one hole per line. Use either "hole,par,blue,white,red" or "par,blue,white,red".</p>
                </div>

                <input
                  type="text"
                  className="course-manager-input"
                  placeholder="Course name"
                  value={newCourseName}
                  onChange={(e) => {
                    setNewCourseName(e.target.value);
                    setCourseImportError('');
                  }}
                />

                <div className="course-template-row">
                  <button
                    type="button"
                    className="toggle-button"
                    onClick={() => setCourseImportText(buildCourseTemplate(9))}
                  >
                    Load 9-hole template
                  </button>
                  <button
                    type="button"
                    className="toggle-button"
                    onClick={() => setCourseImportText(buildCourseTemplate(18))}
                  >
                    Load 18-hole template
                  </button>
                </div>

                <textarea
                  className="course-manager-textarea"
                  value={courseImportText}
                  onChange={(e) => {
                    setCourseImportText(e.target.value);
                    setCourseImportError('');
                  }}
                  placeholder="1,4,320,280,240&#10;2,3,165,145,120&#10;3,5,505,455,410"
                  rows={10}
                />

                {courseImportError ? (
                  <p className="course-manager-error">{courseImportError}</p>
                ) : (
                  <p className="course-manager-help">Example: 1,4,320,280,240 means Hole 1, Par 4, Blue 320yd, White 280yd, Red 240yd.</p>
                )}

                <div className="course-template-row">
                  <button
                    type="button"
                    className="button"
                    onClick={saveCustomCourse}
                    disabled={savingCourse}
                  >
                    {savingCourse ? 'Saving...' : 'Save Course'}
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      setShowCourseManager(false);
                      setCourseImportError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
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
            const isExpanded = expandedHoles.includes(index);
            return (
              <div key={index} className={`hole-card ${isExpanded ? '' : 'hole-card--collapsed'}`}>
                {/* Hole Header */}
                <div className="hole-header hole-header--clickable" onClick={() => toggleHoleExpanded(index)}>
                  <div className="hole-number-badge">
                    <span className="hole-emoji">{fancyHole.emoji}</span>
                    <span className="hole-number">{fancyHole.number}</span>
                  </div>
                  <div className="hole-info">
                    <div className="par-info">Par {par}</div>
                    <div className="distance-info">{distance}yd</div>
                  </div>
                  {!isExpanded && (
                    <div className="hole-collapsed-inline">
                      <span>Total: {score.total}</span>
                      <span className={score.total - par > 0 ? 'over-par' : score.total - par < 0 ? 'under-par' : 'even-par'}>
                        {score.total - par > 0 ? `+${score.total - par}` : score.total - par === 0 ? 'E' : score.total - par}
                      </span>
                    </div>
                  )}
                  <span className="hole-chevron">{isExpanded ? '▲' : '▼'}</span>
                </div>

                {isExpanded ? (
                  <>
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

                      <div className="hole-save-row">
                        <button
                          className="button hole-save-btn"
                          onClick={() => saveDraft(index + 1)}
                          type="button"
                        >
                          💾 Save Hole {index + 1}
                        </button>
                        {savedHoleNumbers.includes(index + 1) ? (
                          <span className="hole-save-note">Saved</span>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : null}
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
            <span className="summary-label">🏆 Best score</span>
            <span className="summary-badge summary-badge--gold">
              {bestScore === null ? '—' : bestScore}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">📊 Average score</span>
            <span className="summary-badge summary-badge--blue">
              {averageScore === null ? '—' : averageScore}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">🎮 Total rounds saved</span>
            <span className="summary-badge summary-badge--green">
              {history.length}
            </span>
          </div>
        </div>
        <div className="analysis-box">
          <strong>🤖 AI Analysis</strong>
          {aiLoading ? (
            <p>Loading AI recommendations...</p>
          ) : (
            <>
              <p>{aiAnalysis.currentRound}</p>
              <p>{aiAnalysis.history}</p>
            </>
          )}
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
                  <div className="history-item-header">
                    <strong>📅 {round.date_played} at {courses.find(c => c.id === round.course_id)?.name || 'Unknown Course'} ({round.tee_color} tee)</strong>
                    <button
                      className="delete-round-btn"
                      type="button"
                      onClick={() => deleteSavedRound(round.id)}
                      title="Delete this round"
                    >
                      Delete
                    </button>
                  </div>
                  <div>{round.hole_count} holes • Score {round.total_score} (Par {round.total_par}) • {round.total_score - round.total_par > 0 ? '+' : ''}{round.total_score - round.total_par} 🏌️</div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px', alignItems: 'center' }}>
                    {[
                      { icon: shotIcons.driver,   label: 'Driver',   count: totalShots.driver },
                      { icon: shotIcons.fairway,  label: 'Fairway',  count: totalShots.fairway },
                      { icon: shotIcons.iron,     label: 'Iron',     count: totalShots.iron },
                      { icon: shotIcons.pitching, label: 'Pitching', count: totalShots.pitching },
                      { icon: shotIcons.putting,  label: 'Putting',  count: totalShots.putting },
                    ].map(({ icon, label, count }) => (
                      <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.85rem', color: '#374151' }}>
                        <img src={icon} alt={label} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                        {count}
                      </span>
                    ))}
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
