-- Golf Scoring App Database Schema
-- Run this in your Supabase SQL editor

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Holes table
CREATE TABLE holes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  par INTEGER NOT NULL,
  blue_distance INTEGER,
  white_distance INTEGER,
  red_distance INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, hole_number)
);

-- Rounds table
CREATE TABLE rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  tee_color TEXT NOT NULL CHECK (tee_color IN ('blue', 'white', 'red')),
  hole_count INTEGER NOT NULL DEFAULT 9,
  total_score INTEGER NOT NULL,
  total_par INTEGER NOT NULL,
  date_played DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hole scores table (detailed breakdown per hole)
CREATE TABLE hole_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL,
  total_shots INTEGER NOT NULL,
  driver_shots INTEGER NOT NULL DEFAULT 0,
  fairway_shots INTEGER NOT NULL DEFAULT 0,
  iron_shots INTEGER NOT NULL DEFAULT 0,
  pitching_shots INTEGER NOT NULL DEFAULT 0,
  putting_shots INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(round_id, hole_number)
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE hole_scores ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - you can restrict later)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on courses" ON courses FOR ALL USING (true);
CREATE POLICY "Allow all operations on holes" ON holes FOR ALL USING (true);
CREATE POLICY "Allow all operations on rounds" ON rounds FOR ALL USING (true);
CREATE POLICY "Allow all operations on hole_scores" ON hole_scores FOR ALL USING (true);

-- Insert default courses data
INSERT INTO courses (name) VALUES ('Bellevue Golf Course');
INSERT INTO courses (name) VALUES ('Eagle''s Talon');
INSERT INTO courses (name) VALUES ('Coyote Creek');

-- Insert Bellevue Golf Course holes
INSERT INTO holes (course_id, hole_number, par, blue_distance, white_distance, red_distance)
SELECT (SELECT id FROM courses WHERE name = 'Bellevue Golf Course'),
       hole_number, par, blue_distance, white_distance, red_distance
FROM (VALUES
  (1, 4, 377, 292, 265),
  (2, 4, 485, 293, 279),
  (3, 3, 147, 120, 105),
  (4, 4, 396, 292, 261),
  (5, 4, 485, 308, 290),
  (6, 3, 170, 131, 96),
  (7, 5, 340, 474, 436),
  (8, 4, 198, 360, 339),
  (9, 5, 341, 462, 438),
  (10, 4, 324, 292, 265),
  (11, 4, 326, 293, 279),
  (12, 3, 148, 120, 105),
  (13, 4, 306, 292, 261),
  (14, 4, 329, 308, 290),
  (15, 3, 159, 131, 96),
  (16, 5, 494, 474, 339),
  (17, 4, 395, 360, 236),
  (18, 5, 525, 462, 301)
) AS v(hole_number, par, blue_distance, white_distance, red_distance);

-- Insert Eagle's Talon holes
INSERT INTO holes (course_id, hole_number, par, blue_distance, white_distance, red_distance)
SELECT (SELECT id FROM courses WHERE name = 'Eagle''s Talon'),
       hole_number, par, blue_distance, white_distance, red_distance
FROM (VALUES
  (1, 4, 386, 350, 278),
  (2, 5, 557, 520, 449),
  (3, 4, 368, 355, 288),
  (4, 4, 423, 397, 341),
  (5, 4, 449, 411, 343),
  (6, 4, 401, 357, 343),
  (7, 3, 178, 143, 111),
  (8, 4, 350, 319, 283),
  (9, 3, 169, 138, 98),
  (10, 5, 551, 521, 449),
  (11, 5, 482, 444, 400),
  (12, 4, 359, 325, 264),
  (13, 4, 376, 356, 299),
  (14, 3, 198, 171, 143),
  (15, 4, 441, 394, 336),
  (16, 4, 415, 383, 307),
  (17, 3, 174, 155, 117),
  (18, 5, 566, 555, 449)
) AS v(hole_number, par, blue_distance, white_distance, red_distance);

-- Insert Coyote Creek holes
INSERT INTO holes (course_id, hole_number, par, blue_distance, white_distance, red_distance)
SELECT (SELECT id FROM courses WHERE name = 'Coyote Creek'),
       hole_number, par, blue_distance, white_distance, red_distance
FROM (VALUES
  (1, 4, 365, 326, 301),
  (2, 5, 530, 499, 482),
  (3, 4, 398, 360, 336),
  (4, 4, 373, 344, 321),
  (5, 3, 183, 147, 116),
  (6, 4, 331, 308, 284),
  (7, 4, 306, 279, 279),
  (8, 5, 460, 436, 409),
  (9, 3, 135, 109, 109),
  (10, 5, 548, 506, 479),
  (11, 4, 379, 327, 323),
  (12, 4, 410, 388, 372),
  (13, 3, 150, 120, 85),
  (14, 4, 360, 330, 315),
  (15, 4, 425, 395, 380),
  (16, 3, 175, 145, 130),
  (17, 4, 440, 410, 395),
  (18, 4, 420, 390, 375)
) AS v(hole_number, par, blue_distance, white_distance, red_distance);