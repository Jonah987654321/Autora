import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { login as apiLogin, refresh as apiRefresh } from '../api/auth';

interface AuthContextType {
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true)

    const isAuthenticated = token !== null;

    useEffect(() => {
        apiRefresh()
            .then((data) => setToken(data.accessToken))
            .catch(() => setToken(null))
            .finally(() => setIsLoading(false));
    }, []);

    const login = async (email: string, password: string) => {
        const data = await apiLogin(email, password); 
        
        setToken(data.accessToken);
        localStorage.setItem('accessToken', data.accessToken);
    };

    const logout = () => {
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, isAuthenticated, isLoading, login, logout }}>
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