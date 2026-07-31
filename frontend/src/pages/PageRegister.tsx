import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { getErrorStatus } from "@/lib/errors";

export default function PageRegister() {
  const { t } = useTranslation();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [fullNameInvalid, setFullNameInvalid] = useState(false);

  const [email, setEmail] = useState("");
  const [emailInvalid, setEmailInvalid] = useState(false);

  const [password, setPassword] = useState("");
  const [passwordInvalid, setPasswordInvalid] = useState(false);
  const [passwordHintVisible, setPasswordHintVisible] = useState(false);

  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [passwordRepeatInvalid, setPasswordRepeatInvalid] = useState(false);
  const [passwordRepeatHintVisible, setPasswordRepeatHintVisible] =
    useState(false);

  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setGeneralError(null);

    let isInvalid = false;

    if (fullName === "") {
      setFullNameInvalid(true);
      isInvalid = true;
    }
    if (email === "") {
      setEmailInvalid(true);
      isInvalid = true;
    }
    if (password === "") {
      setPasswordInvalid(true);
      isInvalid = true;
    } else if (password.length < 8) {
      setPasswordInvalid(true);
      setPasswordHintVisible(true);
      isInvalid = true;
    }
    if (passwordRepeat === "") {
      setPasswordRepeatInvalid(true);
      isInvalid = true;
    } else if (password !== passwordRepeat) {
      setPasswordRepeatInvalid(true);
      setPasswordRepeatHintVisible(true);
      isInvalid = true;
    }

    if (isInvalid) {
      return;
    }

    try {
      await register(fullName, email, password);
    } catch (error) {
      const status = getErrorStatus(error);
      if (status === 409) {
        setEmailInvalid(true);
        setGeneralError(t("preauth.emailAlreadyRegistered"));
      } else {
        setGeneralError(t("preauth.serverError"));
        console.error("Signup failed: ", error);
      }
    }
  };

  return (
    <div className="w-full h-screen bg-accent flex justify-center items-center p-4">
      <div className="w-full max-w-sm bg-card text-card-foreground p-8 rounded-xl shadow-lg border">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("preauth.titleRegister")}
          </h1>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <Field data-invalid={fullNameInvalid}>
            <FieldLabel htmlFor="input-fullName">
              {t("preauth.fullName")}
            </FieldLabel>
            <Input
              id="input-fullName"
              type="text"
              placeholder={t("preauth.fullNamePlaceholder")}
              value={fullName}
              aria-invalid={fullNameInvalid}
              onChange={(e) => {
                setFullName(e.target.value);
                setFullNameInvalid(false);
              }}
              onBlur={(e) => {
                if (e.target.value === "") {
                  setFullNameInvalid(true);
                }
              }}
            />
          </Field>

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
                setPasswordHintVisible(false);
              }}
              onBlur={(e) => {
                if (e.target.value === "") {
                  setPasswordInvalid(true);
                } else if (e.target.value.length < 8) {
                  setPasswordInvalid(true);
                  setPasswordHintVisible(true);
                }
              }}
            />
            <FieldDescription
              className={passwordHintVisible ? "text-red-600" : "hidden"}
            >
              {t("preauth.passwordRequirement")}
            </FieldDescription>
          </Field>

          <Field data-invalid={passwordRepeatInvalid}>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="input-password-repeat">
                {t("preauth.repeatPassword")}
              </FieldLabel>
            </div>
            <Input
              id="input-password-repeat"
              type="password"
              placeholder={t("preauth.passwordPlaceholder")}
              value={passwordRepeat}
              aria-invalid={passwordRepeatInvalid}
              onChange={(e) => {
                setPasswordRepeat(e.target.value);
                setPasswordRepeatInvalid(false);
                setPasswordRepeatHintVisible(false);
              }}
              onBlur={(e) => {
                if (e.target.value === "") {
                  setPasswordRepeatInvalid(true);
                } else if (password !== passwordRepeat) {
                  setPasswordRepeatInvalid(true);
                  setPasswordRepeatHintVisible(true);
                }
              }}
            />
            <FieldDescription
              className={passwordRepeatHintVisible ? "text-red-600" : "hidden"}
            >
              {t("preauth.passwordRepeatNoMatch")}
            </FieldDescription>
          </Field>

          {generalError && (
            <p className="text-sm text-red-600 text-center">{generalError}</p>
          )}

          <Button type="submit" className="w-full mt-7">
            {t("preauth.registerSubmit")}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            {t("preauth.accountAlready")}{" "}
          </span>
          <NavLink
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            {t("preauth.loginNow")}
          </NavLink>
        </div>
      </div>
    </div>
  );
}
