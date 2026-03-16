import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { storageService } from "../../lib/storageService";
import { useAuthStore } from "../../store/authStore";

type AuthGuardProps = {
  children: ReactNode;
};

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const location = useLocation();
  const currentUserEmail = useAuthStore((state) => state.currentUserEmail);
  const authToken = useAuthStore((state) => state.authToken);
  const activeIdentifier = storageService.getActiveIdentifier();

  if (!currentUserEmail || !authToken || !activeIdentifier) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <>{children}</>;
};
