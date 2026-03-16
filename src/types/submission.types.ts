export const SubmissionStatus = {
  RECEIVED: "استلمنا طلبك",
  REVIEWING: "بنراجع المتطلبات",
  DESIGNING: "بنصمم",
  BUILDING: "بنبني",
  DELIVERED: "اتسلّم!",
} as const;

export type SubmissionStatus =
  (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export interface Submission {
  id: string;
  submittedAt: string;
  status: SubmissionStatus;
  currentStage: number;
  estimatedDelivery: string | null;

  clientName: string;
  businessName: string;
  businessDescription: string;
  customerType: string[];
  uniqueValue: string;

  whyNow: string;
  successDefinition: string;
  hasExistingWebsite: boolean;
  existingWebsiteFeedback: string | null;
  inspiredSites: string[];
  inspiredSitesFeedback: string | null;
  dislikedSite: string | null;
  dislikedSiteFeedback: string | null;

  pages: string[];
  features: string[];
  contentResponsibility: string;
  hasBrandAssets: boolean;
  brandAssetsFiles: string[];

  budget: string;
  hasDeadline: boolean;
  deadline: string | null;
  deadlineReason: string | null;
  approver: string;
  phone: string;
  additionalNotes: string | null;
  stylePreferences: string[];
}
