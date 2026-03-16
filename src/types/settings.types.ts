export type ProfileSettings = {
  projectUpdates: boolean;
  whatsappReminders: boolean;
  emailReports: boolean;
  whatsappNumber: string;
};

export const defaultProfileSettings: ProfileSettings = {
  projectUpdates: true,
  whatsappReminders: false,
  emailReports: false,
  whatsappNumber: "",
};
