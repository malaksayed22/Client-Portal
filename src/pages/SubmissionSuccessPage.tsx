import { motion } from "framer-motion";
import { useMemo } from "react";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { useFormStore } from "../store/formStore";
import { Button } from "../components/ui/Button";

type SuccessLocationState = {
  submissionId?: string;
};

export const SubmissionSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const submissionIdFromState = (location.state as SuccessLocationState | null)
    ?.submissionId;
  const submissionIdFromStore = useFormStore((state) => state.submissionId);

  const submissionId = useMemo(
    () => submissionIdFromState ?? submissionIdFromStore ?? "-",
    [submissionIdFromState, submissionIdFromStore],
  );

  const copySubmissionId = async () => {
    try {
      await navigator.clipboard.writeText(submissionId);
      toast.success("اتنسخ!");
    } catch {
      toast.error("ماعرفناش ننسخ الرقم");
    }
  };

  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-8 sm:px-6"
      dir="rtl"
    >
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8"
      >
        <h1 className="font-heading text-3xl font-bold text-textPrimary">
          تمام! وصلنا طلبك
        </h1>
        <p className="mt-2 text-textSecondary">
          هنراجع التفاصيل ونتواصل معاك قريب جداً.
        </p>

        <div className="mt-6 rounded-xl border border-border bg-background p-4 text-right">
          <p className="text-sm font-semibold text-textPrimary">رقم طلبك:</p>
          <button
            type="button"
            onClick={copySubmissionId}
            className="mt-2 inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-textPrimary transition-colors hover:border-primary/40"
          >
            {submissionId}
          </button>
          <p className="mt-2 text-xs text-textSecondary">
            احتفظ برقم الطلب ده — هتحتاجه لو حبيت تتابع من جهاز تاني
          </p>
        </div>

        <div className="mt-6">
          <Button
            label="تابع مشروعك"
            variant="primary"
            size="lg"
            onClick={() => navigate("/tracker", { replace: true })}
          />
        </div>
      </motion.section>
    </main>
  );
};

export default SubmissionSuccessPage;
