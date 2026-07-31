import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { getErrorStatus } from "@/lib/errors";

export default function PageLogin() {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [emailInvalid, setEmailInvalid] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordInvalid, setPasswordInvalid] = useState(false);

  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();

    setGeneralError(null);

    if (email === "" || password === "") {
      // Don't call the ui unnecessarily
      if (email === "") setEmailInvalid(true);
      if (password === "") setPasswordInvalid(true);
      return;
    }

    try {
      await login(email, password);
    } catch (error) {
      const status = getErrorStatus(error);

      if (status === 401) {
        setEmailInvalid(true);
        setPasswordInvalid(true);
        setGeneralError(t("preauth.invalidCredentials"));
      } else {
        console.error("Login failed: ", error);
        setGeneralError(t("preauth.serverError"));
      }
    }
  };

  return (
    <div className="w-full h-screen bg-accent flex justify-center items-center p-4">
      <div className="w-full max-w-sm bg-card text-card-foreground p-8 rounded-xl shadow-lg border">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("preauth.titleLogin")}
          </h1>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Field data-invalid={emailInvalid}>
            <FieldLabel htmlFor="input-email">{t("preauth.email")}</FieldLabel>
            <Input
              id="input-email"
              type="email"
              placeholder={t("preauth.emailPlaceholder")}
              value={email}
              aria-invalid={emailInvalid}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailInvalid(false);
              }}
              onBlur={(e) => {
                if (email === "" || !e.target.checkValidity()) {
                  setEmailInvalid(true);
                }
              }}
            />
          </Field>

          <Field data-invalid={passwordInvalid}>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="input-password">
                {t("preauth.password")}
              </FieldLabel>
              <NavLink
                to="/reset-password"
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("preauth.passwordForgot")}
              </NavLink>
            </div>
            <Input
              id="input-password"
              type="password"
              placeholder={t("preauth.passwordPlaceholder")}
              value={password}
              aria-invalid={passwordInvalid}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordInvalid(false);
              }}
              onBlur={(e) => {
                if (e.target.value === "") {
                  setPasswordInvalid(true);
                }
              }}
            />
          </Field>

          {generalError && (
            <p className="text-sm text-red-600 text-center">{generalError}</p>
          )}

          <Button type="submit" className="w-full mt-7">
            {t("preauth.loginSubmit")}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            {t("preauth.noAccountYet")}{" "}
          </span>
          <NavLink
            to="/register"
            className="font-medium text-primary hover:underline"
          >
            {t("preauth.registerNow")}
          </NavLink>
        </div>
      </div>
    </div>
  );
}
