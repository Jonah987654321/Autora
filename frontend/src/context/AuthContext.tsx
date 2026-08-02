import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  login as apiLogin,
  refresh as apiRefresh,
  register as apiRegister,
  logout as apiLogout,
} from "../api/auth";
import { getErrorStatus } from "@/lib/errors";
import { refreshClient, type CustomAxiosRequestConfig } from "@/api/client";
import type { AxiosError } from "axios";

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  hadSession: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [hadSession] = useState(
    () => localStorage.getItem("hadSession") === "true",
  );

  const isAuthenticated = token !== null;

  useEffect(() => {
    let ignore = false;

    apiRefresh()
      .then((data) => {
        if (ignore) return;
        setToken(data.accessToken);
        localStorage.setItem("hadSession", "true");
      })
      .catch((error) => {
        if (ignore) return;
        if (getErrorStatus(error) !== 401) {
          console.error("Silent refresh failed: ", error);
        }
        setToken(null);
        localStorage.removeItem("hadSession");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let interceptorAttachToken = refreshClient.interceptors.request.use(
      function (config: CustomAxiosRequestConfig) {

        console.log(token, config._retried)

        if (token !== null && !config._retried) {
          config.headers.Authorization = "Bearer " + token;
        }
        return config
      },
      null
    );

    let interceptorRefreshToken = refreshClient.interceptors.response.use(
      null,
      async function (error: AxiosError) {
        // Error without server response => pass through (e.g., network error)
        if (error.response === undefined) {
          return Promise.reject(error);
        }

        const originalRequest = error.config as CustomAxiosRequestConfig;

        // Check for 401 unauthorized (=> token refresh needed) and not retried
        if (
          error.response.status == 401 &&
          originalRequest &&
          !originalRequest._retried
        ) {
          originalRequest._retried = true;
          try {
            let data = await apiRefresh();
            setToken(data.accessToken);

            originalRequest.headers.Authorization = "Bearer " + data.accessToken;
            return refreshClient.request(originalRequest);
          } catch (refreshError: any) {
            if (refreshError.response !== undefined && refreshError.response.status == 401) {
              // Refresh is unauthorized => log out
              logout();
              return Promise.reject(refreshError);
            }

            // Other errors (internal server error, network, ...) pass through
            return Promise.reject(refreshError);
          }
        }

        // Pass through for all other HTTP errors
        return Promise.reject(error);
      },
    );

    return () => {
      refreshClient.interceptors.request.eject(interceptorAttachToken);
      refreshClient.interceptors.response.eject(interceptorRefreshToken);
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);

    setToken(data.accessToken);
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
  ) => {
    const data = await apiRegister(fullName, email, password);

    setToken(data.accessToken);
  };

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem("hadSession");

    apiLogout().catch((error) => {
      console.error("Logout request failed: ", error);
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        isLoading,
        hadSession,
        isAuthenticated,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
};
