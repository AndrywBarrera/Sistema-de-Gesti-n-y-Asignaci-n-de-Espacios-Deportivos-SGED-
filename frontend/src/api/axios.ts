import axios from "axios";


const frontURL = import.meta.env.VITE_API_BASE_URL;

export const http = axios.create({
  baseURL: frontURL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
  },
});

let inMemoryToken: string | null = null;
let inMemoryTokenRefresh: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (token) sessionStorage.setItem("auth:token", token);
  else sessionStorage.removeItem("auth:token");
}

export function setRefreshToken(token: string | null) {
  inMemoryTokenRefresh = token;
  if (token) sessionStorage.setItem("auth:refresh_token", token);
  else sessionStorage.removeItem("auth:refresh_token");
}

export function getAuthToken(): string | null {
  return inMemoryToken ?? sessionStorage.getItem("auth:token");
}
export function getRefreshToken(): string | null {
  return inMemoryTokenRefresh ?? sessionStorage.getItem("auth:refresh_token");
}

export function logout(){
  if(getRefreshToken()){
    sessionStorage.removeItem("auth:refresh_token");
  }
  if(getAuthToken()){
    sessionStorage.removeItem("auth:token");
  }
  window.location.href = "/"; 
}

http.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Limpia strings vacíos para no enviar basura
  if (config.data && typeof config.data === "object") {
    const cleaned: Record<string, unknown> = {};
    Object.entries(config.data).forEach(([k, v]) => {
      cleaned[k] = v === "" ? undefined : v;
    });
    config.data = cleaned;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error?.response?.status === 401) {
      try {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const { data } = await http.post("/api/refresh-token", { refreshToken });
          if (data?.accessToken) {
            setAuthToken(data.accessToken);
            error.config.headers["Authorization"] = `Bearer ${data.accessToken}`;
            return http(error.config); 
          }
        }
        setAuthToken(null); 
        window.location.href = "/"; 
      } catch (err) {
        setAuthToken(null);
        window.location.href = "/";
      }
    }
    return Promise.reject(error); 
  }
);