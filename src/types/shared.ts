export type HealthStatus = {
  status: "ok";
  timestamp: string;
};

export type CourseStatus = "draft" | "published";
export type LessonContentType = "video" | "text" | "quiz" | "file" | "image";
export type EnrollmentStatus = "not_started" | "in_progress" | "completed";
export type LearningEventVerb =
  | "course_started"
  | "lesson_completed"
  | "quiz_submitted"
  | "course_completed";

export type AuthUser = {
  id: string;
  orgId: string;
  name: string;
  email: string;
  // Matches what GET /auth/me actually returns (include: userRoles.role) —
  // added so the frontend can gate role-specific UI (e.g. the analytics
  // dashboard) without a second request.
  userRoles: { role: { name: string } }[];
};

export type AnalyticsOrgOverview = {
  activeLearners: number;
  completionRate: number;
  coursesInProgress: number;
  dau: { date: string; count: number }[];
  courseCompletion: {
    courseId: string;
    title: string;
    enrolledCount: number;
    completedCount: number;
    avgProgressPct: number;
  }[];
};

export type CourseStatsPoint = {
  date: string;
  enrolledCount: number;
  completedCount: number;
  avgProgressPct: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type Lesson = {
  id: string;
  moduleId: string;
  title: string;
  contentType: LessonContentType;
  contentUrl: string | null;
  // MinIO object key for an uploaded image/video, set once content has been
  // uploaded via POST /modules/:moduleId/lessons/:lessonId/content. Null for
  // text/quiz lessons and for video/file lessons that only carry an external
  // contentUrl.
  contentKey: string | null;
  contentJson: unknown;
  sortOrder: number;
};

// Stored in Lesson.contentJson when contentType is "quiz". The learner-facing
// GET /enrollments/:id/course strips correctOptionId server-side — the admin
// builder's GET /courses/:id still returns it, so QuizQuestion carries the
// optional field rather than two separate types.
export type QuizOption = { id: string; text: string };
export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId?: string;
};
export type QuizContent = { questions: QuizQuestion[] };

export type QuizSubmitResult = { scorePct: number; correctCount: number; totalCount: number };

export type CourseModule = {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  lessons: Lesson[];
};

export type Course = {
  id: string;
  orgId: string;
  title: string;
  description: string | null;
  status: CourseStatus;
  aiGenerated: boolean;
  thumbnailKey: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Enrollment = {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  progressPct: number;
  startedAt: string | null;
  completedAt: string | null;
  course: Course;
};

export type EnrollmentWithCourseDetail = Omit<Enrollment, "course"> & {
  course: Course & { modules: CourseModule[] };
};
