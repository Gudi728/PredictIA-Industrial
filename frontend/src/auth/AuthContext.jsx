import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiRequest } from "../api/apiClient.js";
import { AuthContext } from "./auth.js";

const TOKEN_STORAGE_KEY = "predictia_token";
const validRoles = new Set(["administrador", "mantenimiento", "operario"]);

// sessionStorage is readable by JavaScript and does not protect against XSS.

const isValidUser = (user) =>
  user !== null &&
  typeof user === "object" &&
  Number.isSafeInteger(user.id_usuario) &&
  user.id_usuario > 0 &&
  typeof user.nombre === "string" &&
  typeof user.apellido === "string" &&
  typeof user.nombre_usuario === "string" &&
  typeof user.correo === "string" &&
  Number.isSafeInteger(user.id_rol) &&
  validRoles.has(user.rol);

const readStoredToken = () => {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const removeStoredToken = () => {
  try {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
};

const storeToken = (token) => {
  try {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    throw new Error("No se pudo guardar la sesión en este navegador.");
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(readStoredToken);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (token ? "restoring" : "anonymous"));
  const tokenRef = useRef(token);
  const sessionVersionRef = useRef(0);

  const clearSession = useCallback((expectedToken) => {
    if (expectedToken && tokenRef.current !== expectedToken) {
      return;
    }

    sessionVersionRef.current += 1;
    tokenRef.current = null;
    setToken(null);
    removeStoredToken();
    setUser(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    const storedToken = tokenRef.current;

    if (!storedToken) {
      tokenRef.current = null;
      return undefined;
    }

    const requestVersion = ++sessionVersionRef.current;
    const controller = new AbortController();
    tokenRef.current = storedToken;

    apiRequest("/auth/me", {
      authenticated: true,
      token: storedToken,
      signal: controller.signal,
      onUnauthorized: () => clearSession(storedToken),
    })
      .then((response) => {
        if (requestVersion !== sessionVersionRef.current) {
          return;
        }

        if (!isValidUser(response?.data)) {
          clearSession(storedToken);
          return;
        }

        setUser(response.data);
        setStatus("authenticated");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          clearSession(storedToken);
        }
      });

    return () => {
      controller.abort();
      if (requestVersion === sessionVersionRef.current) {
        sessionVersionRef.current += 1;
      }
    };
  }, [clearSession]);

  const login = useCallback(
    async ({ identificador, contrasena }) => {
      if (
        typeof identificador !== "string" ||
        !identificador.trim() ||
        typeof contrasena !== "string" ||
        !contrasena.trim()
      ) {
        throw new Error("Ingresá tu identificador y contraseña.");
      }

      const requestVersion = ++sessionVersionRef.current;
      setStatus("authenticating");

      try {
        const loginResponse = await apiRequest("/auth/login", {
          method: "POST",
          body: {
            identificador: identificador.trim(),
            contrasena,
          },
        });

        if (requestVersion !== sessionVersionRef.current) {
          throw new Error("La sesión cambió durante el inicio de sesión.");
        }

        const nextToken = loginResponse?.data?.token;

        if (
          typeof nextToken !== "string" ||
          !nextToken.trim() ||
          !isValidUser(loginResponse?.data?.usuario)
        ) {
          throw new Error("El servidor devolvió una respuesta de inicio de sesión inválida.");
        }

        tokenRef.current = nextToken;
        storeToken(nextToken);

        const profileResponse = await apiRequest("/auth/me", {
          authenticated: true,
          token: nextToken,
          onUnauthorized: () => clearSession(nextToken),
        });

        if (requestVersion !== sessionVersionRef.current) {
          throw new Error("La sesión cambió durante el inicio de sesión.");
        }

        if (!isValidUser(profileResponse?.data)) {
          throw new Error("El servidor devolvió un perfil de usuario inválido.");
        }

        setUser(profileResponse.data);
    setToken(nextToken);
        setStatus("authenticated");
        return profileResponse.data;
      } catch (error) {
        if (requestVersion === sessionVersionRef.current) {
          tokenRef.current = null;
          setToken(null);
          removeStoredToken();
          setUser(null);
          setStatus("anonymous");
        }
        throw error;
      }
    },
    [clearSession]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      status,
      token,
      isLoading: status === "restoring",
      isAuthenticated: status === "authenticated" && user !== null,
      login,
      logout,
      invalidateSession: clearSession,
    }),
    [clearSession, login, logout, status, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
