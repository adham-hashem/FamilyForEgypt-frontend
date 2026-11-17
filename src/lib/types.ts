export type UserRole = 'Student' | 'CollegeEditor' | 'CollegeAdmin' | 'UniversityAdmin' | 'SuperAdmin';
export type PostType = 'News' | 'Event' | 'Announcement';
export type PostStatus = 'Draft' | 'Published';
export type ResourceCategory =
  | 'Schedule' | 'ExamSchedule' | 'Lecture' | 'Tutorial' | 'Summary' | 'Assignment' | 'EducationalEvent' | 'Material' | 'PastExam' | 'Other';
export type ApplicationStatus = 'Pending' | 'Approved' | 'Rejected' | 'NeedsChanges';
export type LeaderSlot = 'President' | 'UniversityPresident' | 'Other';

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  collegeId: number | null;
  collegeName: string | null;
  mustChangePassword: boolean;
  membershipStatus: ApplicationStatus | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  refreshToken: string | null;
  user: User;
}

export interface College {
  id: number;
  name: string;
  description: string | null;
  deanName: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  logoThumbUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  /** Years of study in the college (4 for most, 5 for engineering, up to 7). */
  levelsCount: number;
  studySystemId: number;
  /** How the college counts its study; decides what a level is called (المستوى or المستوى…). */
  studySystem: StudySystem | null;
  /** What this college calls a level when it differs from its study system (null = the system's word). */
  levelWord?: string | null;
}

export interface CollegeDetail {
  college: College;
  postsCount: number;
  resourcesCount: number;
}

export interface PostListItem {
  id: number;
  type: PostType;
  title: string;
  summary: string;
  collegeId: number | null;
  collegeName: string | null;
  coverUrl: string | null;
  coverThumbUrl: string | null;
  imagesCount: number;
  eventStartsAt: string | null;
  eventEndsAt: string | null;
  location: string | null;
  isPinned: boolean;
  status: PostStatus;
  publishedAt: string | null;
  createdAt: string;
}

export interface PostImage {
  id: number;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
}

export interface PostDetail extends Omit<PostListItem, 'summary' | 'coverUrl' | 'coverThumbUrl' | 'imagesCount'> {
  body: string;
  updatedAt: string;
  images: PostImage[];
  canEdit: boolean;
  canDelete: boolean;
  attendeesCount: number;
  isAttending: boolean;
  checkedIn: boolean;
}

export interface ResourceFile {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isImage: boolean;
  url: string;
  thumbUrl: string | null;
}

export interface Resource {
  id: number;
  collegeId: number;
  collegeName: string | null;
  category: ResourceCategory;
  title: string;
  description: string | null;
  level: number;
  department: string | null;
  term: number;
  courseName: string | null;
  externalUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  files: ResourceFile[];
  courseId: number | null;
  /** Deadline of an assignment, or the date of an exam or an educational event. */
  dueAt: string | null;
  /** The academic year by its first calendar year (2026 is 2026/2027); null when not tied to a year. */
  academicYear: number | null;
  /** The lecture or week number. */
  sequence: number | null;
}

export interface Leader {
  id: number;
  slot: LeaderSlot;
  name: string;
  title: string;
  photoUrl: string | null;
  sortOrder: number;
}

export interface HomeData {
  settings: Record<string, string>;
  leaders: Leader[];
  stats: { colleges: number; events: number; posts: number; members: number };
  upcomingEvents: PostListItem[];
  latestPosts: PostListItem[];
  colleges: College[];
}

/** What a student sees after entering their national ID. Contact details and the address are left out. */
export interface ApplicationStatusView {
  status: ApplicationStatus;
  reviewNote: string | null;
  membershipNumber: string | null;
  fullName: string;
  studentCode: string;
  collegeId: number;
  collegeName: string;
  department: string | null;
  level: number;
  hasPhoto: boolean;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  /** The check-in code for the QR on the card; members only. */
  memberCode: string | null;
  /** Opens the student's photo for about half an hour. */
  photoToken: string | null;
}

export interface ApplicationListItem {
  id: number;
  fullName: string;
  studentCode: string;
  collegeId: number;
  collegeName: string;
  level: number;
  phone: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDetail {
  id: number;
  status: ApplicationStatus;
  reviewNote: string | null;
  membershipNumber: string | null;
  fullName: string;
  studentCode: string;
  nationalId: string | null;
  collegeId: number;
  collegeName: string;
  department: string | null;
  level: number;
  gender: 'Male' | 'Female';
  birthDate: string;
  phone: string;
  whatsApp: string | null;
  email: string;
  governorate: string;
  city: string | null;
  address: string;
  preferredCommittee: string | null;
  skills: string | null;
  previousActivities: string | null;
  motivation: string | null;
  hasPhoto: boolean;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  /** Only applications sent from an old student account have one. */
  accountEmail: string | null;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  collegeId: number | null;
  collegeName: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  canManage: boolean;
}

export interface AdminStats {
  pendingApplications: number;
  approvedMembers: number;
  posts: number;
  draftPosts: number;
  resources: number;
  colleges: number;
  staff: number;
  students: number;
}

export interface AuditLog {
  id: number;
  userName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

export interface AttendanceState {
  attendeesCount: number;
  isAttending: boolean;
  checkedIn: boolean;
}

export interface Attendee {
  memberId: number;
  fullName: string;
  membershipNumber: string | null;
  collegeName: string | null;
  registeredAt: string;
  checkedInAt: string | null;
  /** Order of arrival at the event; null until the person is checked in. */
  badgeNumber: number | null;
}

export interface Attendees {
  total: number;
  checkedIn: number;
  items: Attendee[];
}

export interface CheckInResult {
  memberId: number;
  fullName: string;
  membershipNumber: string | null;
  collegeName: string | null;
  checkedInAt: string;
  badgeNumber: number;
  alreadyCheckedIn: boolean;
}

// ---------- courses ----------

export interface StudySystem {
  id: number;
  name: string;
  /** What a level is called: «المستوى» or «المستوى». */
  levelWord: string;
  usesCredits: boolean;
  sortOrder: number;
  isBuiltIn: boolean;
}

export interface Course {
  id: number;
  collegeId: number;
  collegeName: string | null;
  name: string;
  code: string | null;
  level: number;
  term: number;
  department: string | null;
  instructor: string | null;
  description: string | null;
  isPublished: boolean;
  resourcesCount: number;
  updatedAt: string;
  /** By its first calendar year: 2026 is 2026/2027. */
  academicYear: number;
  /** 0 unspecified, 1 required, 2 elective, 3 university requirement, 4 college requirement. */
  kind: number;
  creditHours: number | null;
  prerequisite: string | null;
  language: string | null;
}

// ---------- advertising ----------

export type AdPlacement = 'Home' | 'Feed' | 'Content';
export type AdRequestStatus = 'New' | 'Contacted' | 'Accepted' | 'Rejected';

export interface Ad {
  id: number;
  title: string;
  advertiserName: string;
  description: string | null;
  imageUrl: string;
  thumbUrl: string;
  imageWidth: number;
  imageHeight: number;
  hasLink: boolean;
  placement: AdPlacement;
}

export interface AdAdmin {
  id: number;
  title: string;
  advertiserName: string;
  description: string | null;
  imageUrl: string;
  thumbUrl: string;
  linkUrl: string | null;
  placement: AdPlacement;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  isLive: boolean;
  sortOrder: number;
  clicks: number;
  adRequestId: number | null;
  createdAt: string;
}

export interface AdRequest {
  id: number;
  organizationName: string;
  contactName: string;
  phone: string;
  email: string | null;
  website: string | null;
  adKind: string | null;
  message: string;
  status: AdRequestStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- suggestions and complaints ----------

export type FeedbackKind = 'Suggestion' | 'Complaint';
export type FeedbackTopic = 'Activities' | 'Education' | 'Other';
export type FeedbackStatus = 'New' | 'InReview' | 'Resolved';

export interface MyFeedback {
  id: number;
  kind: FeedbackKind;
  topic: FeedbackTopic;
  subject: string;
  message: string;
  status: FeedbackStatus;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface FeedbackItem extends MyFeedback {
  fullName: string;
  nationalIdMasked: string;
  collegeId: number;
  collegeName: string;
  department: string | null;
  level: number;
  phone: string | null;
  updatedAt: string;
}

// ---------- competitions ----------

export type CompetitionCategory = 'Cultural' | 'Religious' | 'Scientific' | 'Sports' | 'Arts' | 'Literary' | 'Technology' | 'Other';
export type CompetitionMode = 'OnSite' | 'Online';
export type CompetitionFormat = 'Registration' | 'Riddle' | 'Quiz' | 'Submission';

export interface QuizQuestion {
  text: string;
  options: string[];
  /** Only sent once the results are published (or to organisers). */
  correct: number | null;
}

export interface CompetitionListItem {
  id: number;
  title: string;
  summary: string;
  category: CompetitionCategory;
  mode: CompetitionMode;
  format: CompetitionFormat;
  collegeId: number | null;
  collegeName: string | null;
  thumbUrl: string | null;
  prize: string | null;
  eventAt: string | null;
  opensAt: string | null;
  closesAt: string | null;
  isOpen: boolean;
  resultsPublished: boolean;
  entriesCount: number;
  isPublished: boolean;
}

export interface Winner {
  fullName: string;
  collegeName: string;
  rank: number | null;
}

export interface Competition {
  id: number;
  title: string;
  description: string;
  category: CompetitionCategory;
  mode: CompetitionMode;
  format: CompetitionFormat;
  collegeId: number | null;
  collegeName: string | null;
  imageUrl: string | null;
  thumbUrl: string | null;
  prize: string | null;
  rules: string | null;
  location: string | null;
  eventAt: string | null;
  opensAt: string | null;
  closesAt: string | null;
  question: string | null;
  questions: QuizQuestion[];
  acceptedAnswers: string[];
  isOpen: boolean;
  isPublished: boolean;
  resultsPublished: boolean;
  entriesCount: number;
  winners: Winner[];
  canManage: boolean;
}

export interface CompetitionEntry {
  id: number;
  fullName: string;
  nationalIdMasked: string;
  collegeName: string;
  department: string | null;
  level: number;
  phone: string | null;
  answer: string | null;
  choices: number[];
  hasFile: boolean;
  fileName: string | null;
  isCorrect: boolean | null;
  score: number | null;
  isWinner: boolean;
  rank: number | null;
  createdAt: string;
}

export interface DepartmentKind { id: number; name: string; sortOrder: number; isBuiltIn: boolean }
export interface Department { id: number; collegeId: number; name: string; kind: number; sortOrder: number }
