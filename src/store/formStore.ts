import { create } from "zustand";
import {
  initialFormData,
  type ClientIntakeFormData,
} from "../types/form.types";
import { storageService } from "../lib/storageService";

type StepKey = keyof ClientIntakeFormData;

type PartialStepData = {
  [K in StepKey]: Partial<ClientIntakeFormData[K]>;
};

export type FormDirection = "forward" | "backward";

type FormStore = {
  currentStep: number;
  navigationDirection: FormDirection;
  formData: ClientIntakeFormData;
  isSubmitted: boolean;
  submittedAt: string | null;
  submissionId: string | null;
  trackerPhone: string;
  nextStep: () => void;
  prevStep: () => void;
  setDirection: (direction: FormDirection) => void;
  updateStepData: <K extends StepKey>(
    step: K,
    data: PartialStepData[K],
  ) => void;
  lockForm: (submissionId: string) => void;
  restoreProgress: (progress: {
    currentStep?: number;
    formData?: ClientIntakeFormData;
    savedAt?: string;
  }) => void;
  setTrackerPhone: (phone: string) => void;
  startNewRequest: () => void;
  resetForm: () => void;
};

const TOTAL_STEPS = 4;
const initialFormState = {
  currentStep: 1,
  navigationDirection: "forward" as FormDirection,
  formData: initialFormData,
  isSubmitted: false,
  submittedAt: null,
  submissionId: null,
};

export const useFormStore = create<FormStore>()((set, get) => {
  const saveProgressToStorage = () => {
    const identifier = storageService.getActiveIdentifier();
    if (!identifier) {
      return;
    }

    const state = get();
    storageService.save(identifier, "formProgress", {
      currentStep: state.currentStep,
      formData: state.formData,
      savedAt: new Date().toISOString(),
    });
  };

  return {
    ...initialFormState,
    trackerPhone: "",
    nextStep: () => {
      set((state) => ({
        currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS),
        navigationDirection: "forward",
      }));
      saveProgressToStorage();
    },
    prevStep: () => {
      set((state) => ({
        currentStep: Math.max(state.currentStep - 1, 1),
        navigationDirection: "backward",
      }));
      saveProgressToStorage();
    },
    setDirection: (direction) => set({ navigationDirection: direction }),
    updateStepData: (step, data) => {
      let changed = false;

      set((state) => {
        const mergedStep = {
          ...state.formData[step],
          ...data,
        } as ClientIntakeFormData[typeof step];

        if (
          JSON.stringify(state.formData[step]) === JSON.stringify(mergedStep)
        ) {
          return state;
        }

        changed = true;
        return {
          formData: {
            ...state.formData,
            [step]: mergedStep,
          },
        };
      });

      if (changed) {
        saveProgressToStorage();
      }
    },
    lockForm: (submissionId) =>
      set({
        isSubmitted: true,
        submittedAt: new Date().toISOString(),
        submissionId,
      }),
    restoreProgress: (progress) => {
      if (!progress.formData) {
        return;
      }

      set({
        currentStep:
          typeof progress.currentStep === "number"
            ? Math.min(Math.max(progress.currentStep, 1), TOTAL_STEPS)
            : 1,
        formData: {
          ...initialFormData,
          ...progress.formData,
        },
        navigationDirection: "forward",
        isSubmitted: false,
        submittedAt: null,
        submissionId: null,
      });
    },
    setTrackerPhone: (phone) => set({ trackerPhone: phone }),
    startNewRequest: () =>
      set((state) => ({
        ...initialFormState,
        trackerPhone: state.trackerPhone,
      })),
    resetForm: () =>
      set(() => ({
        ...initialFormState,
        trackerPhone: "",
      })),
  };
});
