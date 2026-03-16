import { useCallback, useEffect, useRef, useState } from "react";
import { storageService } from "../lib/storageService";
import { useFormStore } from "../store/formStore";

export const useFormPersist = () => {
  const resetForm = useFormStore((state) => state.resetForm);
  const formData = useFormStore((state) => state.formData);
  const currentStep = useFormStore((state) => state.currentStep);
  const [showAutoSaved, setShowAutoSaved] = useState(false);
  const isFirstRender = useRef(true);

  const clearPersistedForm = useCallback(() => {
    const identifier = storageService.getActiveIdentifier();
    if (identifier) {
      storageService.save(identifier, "formProgress", null);
    }
    resetForm();
  }, [resetForm]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const showTimer = window.setTimeout(() => {
      setShowAutoSaved(true);
    }, 0);

    const hideTimer = window.setTimeout(() => {
      setShowAutoSaved(false);
    }, 1400);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [formData, currentStep]);

  return {
    clearPersistedForm,
    showAutoSaved,
  };
};
