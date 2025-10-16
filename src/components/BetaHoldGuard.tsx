import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Props = { children: React.ReactNode };

export default function BetaHoldGuard({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const HOLD = (import.meta.env.VITE_BETA_HOLD ?? "").toString() === "true";

  useEffect(() => {
    if (!HOLD) return;
    const current = location.pathname || "/";
    const isWelcome = current.startsWith("/welcome-beta");
    if (!isWelcome) {
      navigate("/welcome-beta", { replace: true });
    }
  }, [HOLD]);

  return <>{children}</>;
}