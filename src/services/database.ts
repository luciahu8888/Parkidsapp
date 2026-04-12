import { supabase } from '../supabase';

export interface User {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DBCourse {
  id: string;
  name: string;
  holes: DBHole[];
}

export interface DBHole {
  id: string;
  course_id: string;
  hole_number: number;
  par: number;
  blue_distance: number;
  white_distance: number;
  red_distance: number;
}

export interface Course {
  id: string;
  name: string;
  holes: Hole[];
}

export interface Hole {
  par: number;
  blue: number;
  white: number;
  red: number;
}

export interface Round {
  id: string;
  user_id: string;
  course_id: string;
  tee_color: 'blue' | 'white' | 'red';
  hole_count: number;
  total_score: number;
  total_par: number;
  date_played: string;
  hole_scores: HoleScore[];
}

export interface HoleScore {
  id: string;
  round_id: string;
  hole_number: number;
  total_shots: number;
  driver_shots: number;
  fairway_shots: number;
  iron_shots: number;
  pitching_shots: number;
  putting_shots: number;
}

// User operations
export const userService = {
  async getAllUsers(): Promise<User[]> {
    console.log('Fetching users from Supabase...');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
    console.log('Found users:', data?.length || 0, data);
    return data || [];
  },

  async createUser(name: string): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  }
};

// Course operations
export const courseService = {
  async getAllCourses(): Promise<DBCourse[]> {
    console.log('Fetching courses from Supabase...');
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .order('name');

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      throw coursesError;
    }

    console.log('Found courses:', courses?.length || 0, courses);

    const coursesWithHoles = await Promise.all(
      (courses || []).map(async (course: DBCourse) => {
        console.log('Fetching holes for course:', course.name, course.id);
        const { data: holes, error: holesError } = await supabase
          .from('holes')
          .select('*')
          .eq('course_id', course.id)
          .order('hole_number');

        if (holesError) {
          console.error('Error fetching holes for course', course.name, ':', holesError);
          throw holesError;
        }

        console.log('Found holes for', course.name, ':', holes?.length || 0);

        return {
          ...course,
          holes: holes || []
        };
      })
    );

    return coursesWithHoles;
  }
};

// Round operations
export const roundService = {
  async getUserRounds(userId: string): Promise<Round[]> {
    const { data: rounds, error: roundsError } = await supabase
      .from('rounds')
      .select(`
        *,
        hole_scores (*)
      `)
      .eq('user_id', userId)
      .order('date_played', { ascending: false })
      .limit(12);

    if (roundsError) throw roundsError;
    return rounds || [];
  },

  async saveRound(round: Omit<Round, 'id' | 'hole_scores'> & { hole_scores: Omit<HoleScore, 'id' | 'round_id'>[] }): Promise<Round> {
    // First create the round
    const { data: roundData, error: roundError } = await supabase
      .from('rounds')
      .insert([{
        user_id: round.user_id,
        course_id: round.course_id,
        tee_color: round.tee_color,
        hole_count: round.hole_count,
        total_score: round.total_score,
        total_par: round.total_par,
        date_played: round.date_played
      }])
      .select()
      .single();

    if (roundError) throw roundError;

    // Then create hole scores
    const holeScoresData = round.hole_scores.map(score => ({
      ...score,
      round_id: roundData.id
    }));

    const { data: scoresData, error: scoresError } = await supabase
      .from('hole_scores')
      .insert(holeScoresData)
      .select();

    if (scoresError) throw scoresError;

    return {
      ...roundData,
      hole_scores: scoresData || []
    };
  }
};

// Migration helper
export const migrationService = {
  async checkAndPopulateDatabase() {
    try {
      console.log('Checking database contents...');

      // Check courses
      const courses = await courseService.getAllCourses();
      console.log('Courses in database:', courses.length);

      if (courses.length === 0) {
        console.log('No courses found, populating database...');

        // Insert courses
        const { error: coursesError } = await supabase
          .from('courses')
          .insert([
            { name: 'Bellevue Golf Course' },
            { name: 'Eagle\'s Talon' },
            { name: 'Coyote Creek' }
          ]);

        if (coursesError) {
          console.error('Error inserting courses:', coursesError);
          return false;
        }

        console.log('Courses inserted successfully');

        // Get the inserted courses with their IDs
        const newCourses = await courseService.getAllCourses();
        console.log('New courses:', newCourses);

        // Insert holes for each course
        for (const course of newCourses) {
          console.log('Inserting holes for', course.name);

          const holesData = this.getHolesDataForCourse(course.name);
          if (holesData.length > 0) {
            const holesWithCourseId = holesData.map(hole => ({
              course_id: course.id,
              hole_number: hole.hole_number,
              par: hole.par,
              blue_distance: hole.blue,
              white_distance: hole.white,
              red_distance: hole.red
            }));

            const { error: holesError } = await supabase
              .from('holes')
              .insert(holesWithCourseId);

            if (holesError) {
              console.error('Error inserting holes for', course.name, ':', holesError);
            } else {
              console.log('Holes inserted for', course.name);
            }
          }
        }

        return true;
      }

      return true;
    } catch (error) {
      console.error('Error in checkAndPopulateDatabase:', error);
      return false;
    }
  },

  getHolesDataForCourse(courseName: string) {
    const courseData: Record<string, any[]> = {
      'Bellevue Golf Course': [
        { hole_number: 1, par: 4, blue: 377, white: 292, red: 265 },
        { hole_number: 2, par: 4, blue: 485, white: 293, red: 279 },
        { hole_number: 3, par: 3, blue: 147, white: 120, red: 105 },
        { hole_number: 4, par: 4, blue: 396, white: 292, red: 261 },
        { hole_number: 5, par: 4, blue: 485, white: 308, red: 290 },
        { hole_number: 6, par: 3, blue: 170, white: 131, red: 96 },
        { hole_number: 7, par: 5, blue: 340, white: 474, red: 436 },
        { hole_number: 8, par: 4, blue: 198, white: 360, red: 339 },
        { hole_number: 9, par: 5, blue: 341, white: 462, red: 438 },
        { hole_number: 10, par: 4, blue: 324, white: 292, red: 265 },
        { hole_number: 11, par: 4, blue: 326, white: 293, red: 279 },
        { hole_number: 12, par: 3, blue: 148, white: 120, red: 105 },
        { hole_number: 13, par: 4, blue: 306, white: 292, red: 261 },
        { hole_number: 14, par: 4, blue: 329, white: 308, red: 290 },
        { hole_number: 15, par: 3, blue: 159, white: 131, red: 96 },
        { hole_number: 16, par: 5, blue: 494, white: 474, red: 339 },
        { hole_number: 17, par: 4, blue: 395, white: 360, red: 236 },
        { hole_number: 18, par: 5, blue: 525, white: 462, red: 301 }
      ],
      'Eagle\'s Talon': [
        { hole_number: 1, par: 4, blue: 386, white: 350, red: 278 },
        { hole_number: 2, par: 5, blue: 557, white: 520, red: 449 },
        { hole_number: 3, par: 4, blue: 368, white: 355, red: 288 },
        { hole_number: 4, par: 4, blue: 423, white: 397, red: 341 },
        { hole_number: 5, par: 4, blue: 449, white: 411, red: 343 },
        { hole_number: 6, par: 4, blue: 401, white: 357, red: 343 },
        { hole_number: 7, par: 3, blue: 178, white: 143, red: 111 },
        { hole_number: 8, par: 4, blue: 350, white: 319, red: 283 },
        { hole_number: 9, par: 3, blue: 169, white: 138, red: 98 },
        { hole_number: 10, par: 5, blue: 551, white: 521, red: 449 },
        { hole_number: 11, par: 5, blue: 482, white: 444, red: 400 },
        { hole_number: 12, par: 4, blue: 359, white: 325, red: 264 },
        { hole_number: 13, par: 4, blue: 376, white: 356, red: 299 },
        { hole_number: 14, par: 3, blue: 198, white: 171, red: 143 },
        { hole_number: 15, par: 4, blue: 441, white: 394, red: 336 },
        { hole_number: 16, par: 4, blue: 415, white: 383, red: 307 },
        { hole_number: 17, par: 3, blue: 174, white: 155, red: 117 },
        { hole_number: 18, par: 5, blue: 566, white: 555, red: 449 }
      ],
      'Coyote Creek': [
        { hole_number: 1, par: 4, blue: 365, white: 326, red: 301 },
        { hole_number: 2, par: 5, blue: 530, white: 499, red: 482 },
        { hole_number: 3, par: 4, blue: 398, white: 360, red: 336 },
        { hole_number: 4, par: 4, blue: 373, white: 344, red: 321 },
        { hole_number: 5, par: 3, blue: 183, white: 147, red: 116 },
        { hole_number: 6, par: 4, blue: 331, white: 308, red: 284 },
        { hole_number: 7, par: 4, blue: 306, white: 279, red: 279 },
        { hole_number: 8, par: 5, blue: 460, white: 436, red: 409 },
        { hole_number: 9, par: 3, blue: 135, white: 109, red: 109 },
        { hole_number: 10, par: 5, blue: 548, white: 506, red: 479 },
        { hole_number: 11, par: 4, blue: 379, white: 327, red: 323 },
        { hole_number: 12, par: 4, blue: 410, white: 388, red: 372 },
        { hole_number: 13, par: 3, blue: 150, white: 120, red: 85 },
        { hole_number: 14, par: 4, blue: 360, white: 330, red: 315 },
        { hole_number: 15, par: 4, blue: 425, white: 395, red: 380 },
        { hole_number: 16, par: 3, blue: 175, white: 145, red: 130 },
        { hole_number: 17, par: 4, blue: 440, white: 410, red: 395 },
        { hole_number: 18, par: 4, blue: 420, white: 390, red: 375 }
      ]
    };

    return courseData[courseName] || [];
  },

  async migrateLocalStorageToSupabase() {
    try {
      // Migrate users
      const localUsers = JSON.parse(localStorage.getItem('parkids-users') || '["Kid 1", "Kid 2"]');

      for (const userName of localUsers) {
        try {
          await userService.createUser(userName);
        } catch (error) {
          // User might already exist, skip
          console.log(`User ${userName} already exists or error:`, error);
        }
      }

      // Get all users from Supabase
      const supabaseUsers = await userService.getAllUsers();

      // Migrate history for each user
      for (const user of supabaseUsers) {
        const localHistory = JSON.parse(localStorage.getItem(`parkids-history-${user.name}`) || '[]');

        for (const round of localHistory) {
          try {
            // Find course by name
            const courses = await courseService.getAllCourses();
            const course = courses.find(c => c.name === round.course);

            if (course) {
              await roundService.saveRound({
                user_id: user.id,
                course_id: course.id,
                tee_color: round.tee,
                hole_count: round.holes,
                total_score: round.total,
                total_par: round.par,
                date_played: round.date,
                hole_scores: round.scores.map((score: any, index: number) => ({
                  hole_number: index + 1,
                  total_shots: score.total,
                  driver_shots: score.breakdown.driver,
                  fairway_shots: score.breakdown.fairway,
                  iron_shots: score.breakdown.iron,
                  pitching_shots: score.breakdown.pitching,
                  putting_shots: score.breakdown.putting
                }))
              });
            }
          } catch (error) {
            console.log(`Error migrating round for ${user.name}:`, error);
          }
        }
      }

      console.log('Migration completed successfully!');
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }
};