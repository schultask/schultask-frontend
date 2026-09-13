export type HealthStatus = {
  status: "ok";
  timestamp: string;
};

export type CourseStatus = "draft" | "published";
export type LessonContentType = "video" | "text" | "quiz" | "file";
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
  contentJson: unknown;
  sortOrder: number;
};

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
