export type StepOneData = {
  name: string;
  businessName: string;
  businessDescription: string;
  customerType: string[];
  uniqueValue: string;
};

export type StepTwoData = {
  whyNow: string;
  successDefinition: string;
  hasExistingWebsite: boolean;
  existingWebsiteIssues: string;
  inspiredSites: [string, string, string];
  inspiredSitesReason: string;
  dislikedSiteUrl: string;
  dislikedSiteReason: string;
};

export type StepThreeData = {
  pages: string[];
  features: string[];
  contentResponsibility: string;
  hasBrandAssets: boolean;
  brandAssetNames: string[];
};

export type StepFourData = {
  budget: string;
  hasDeadline: boolean;
  deadlineDate: string;
  deadlineReason: string;
  approver: string;
  phone: string;
  email: string;
  additionalNotes: string;
  stylePreferences: string[];
};

export type ClientIntakeFormData = {
  stepOne: StepOneData;
  stepTwo: StepTwoData;
  stepThree: StepThreeData;
  stepFour: StepFourData;
};

export const initialFormData: ClientIntakeFormData = {
  stepOne: {
    name: "",
    businessName: "",
    businessDescription: "",
    customerType: [],
    uniqueValue: "",
  },
  stepTwo: {
    whyNow: "",
    successDefinition: "",
    hasExistingWebsite: false,
    existingWebsiteIssues: "",
    inspiredSites: ["", "", ""],
    inspiredSitesReason: "",
    dislikedSiteUrl: "",
    dislikedSiteReason: "",
  },
  stepThree: {
    pages: ["home"],
    features: [],
    contentResponsibility: "",
    hasBrandAssets: false,
    brandAssetNames: [],
  },
  stepFour: {
    budget: "",
    hasDeadline: false,
    deadlineDate: "",
    deadlineReason: "",
    approver: "",
    phone: "",
    email: "",
    additionalNotes: "",
    stylePreferences: [],
  },
};
