export type UserRole = 'Student' | 'CollegeEditor' | 'CollegeAdmin' | 'UniversityAdmin' | 'SuperAdmin';
export type PostType = 'News' | 'Event' | 'Announcement';
export type PostStatus = 'Draft' | 'Published';
export type ResourceCategory = 'Schedule' | 'ExamSchedule' | 'Lecture' | 'Material' | 'Other';
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
  emailConfirmed: boolean;
  emailVerificationRequired: boolean;
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

export interface MyApplication {
  id: number;
  status: ApplicationStatus;
  reviewNote: string | null;
  membershipNumber: string | null;
  fullName: string;
  studentCode: string;
  nationalIdMasked: string;
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

export interface ApplicationDetail extends Omit<MyApplication, 'nationalIdMasked'> {
  nationalId: string | null;
  reviewedByName: string | null;
  accountEmail: string;
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
  userId: string;
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
  userId: string;
  fullName: string;
  membershipNumber: string | null;
  collegeName: string | null;
  checkedInAt: string;
  badgeNumber: number;
  alreadyCheckedIn: boolean;
}
