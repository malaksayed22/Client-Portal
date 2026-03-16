import { motion } from "framer-motion";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { Button } from "../components/ui/Button";
import {
  getLastSubmissionPhone,
  getSubmission,
} from "../lib/submissionStorage";
import { useFormStore } from "../store/formStore";

const StartProjectPage = () => {
  const navigate = useNavigate();
  const isSubmitted = useFormStore((state) => state.isSubmitted);
  const startNewRequest = useFormStore((state) => state.startNewRequest);

  const hasPreviousSubmission = useMemo(() => {
    const lastPhone = getLastSubmissionPhone();
    if (!lastPhone) {
      return false;
    }

    return Boolean(getSubmission(lastPhone));
  }, []);

  const shouldShowChooser = isSubmitted || hasPreviousSubmission;

  useEffect(() => {
    if (!shouldShowChooser) {
      navigate("/form", { replace: true });
    }
  }, [shouldShowChooser, navigate]);

  if (!shouldShowChooser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <main className="mx-auto flex w-full max-w-3xl items-center justify-center px-4 py-10 sm:px-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8"
        >
          <h1 className="font-heading text-3xl font-bold text-textPrimary">
            أنت بدأت مشروعك بالفعل
          </h1>
          <p className="mt-3 text-textSecondary">
            ماينفعش تبعت نفس النشاط التجاري مرتين بنفس الطلب.
          </p>
          <p className="mt-1 text-textSecondary">
            تقدر تتابع طلبك الحالي أو تبدأ طلب جديد لنشاط مختلف.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              label="تابع مشروعك"
              variant="primary"
              size="md"
              onClick={() => navigate("/tracker")}
            />
            <Button
              label="ابدأ مشروعك"
              variant="secondary"
              size="md"
              onClick={() => {
                startNewRequest();
                navigate("/form", { replace: true });
              }}
            />
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default StartProjectPage;
