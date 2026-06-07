/**
 * pages/LoginPage.jsx
 * Autenticación via SSO institucional (RF01)
 * Sin dependencia de librería de íconos — SVG inline propio.
 *
 * Lógica de correo:
 *  - "perez"          → perez@uptc.edu.co
 *  - "juan.perez"     → juan.perez@uptc.edu.co
 *  - "juan.perez12"   → juan.perez12@uptc.edu.co
 *  - correo completo  → se acepta directo
 */
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

/* ── Íconos SVG inline (sin librería externa) ─────────────────────────────── */
const IcoMail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);
const IcoLock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IcoEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IcoEyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
    <line x1="2" y1="2" x2="22" y2="22"/>
  </svg>
);
const IcoCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);
const IcoAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IcoArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
const IcoShield = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

/* ── Regex de validación ──────────────────────────────────────────────────── */
const UPTC_PARTIAL = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+(\.[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+\d*)?$/;
const UPTC_FULL    = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+(\.[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+\d*)?@uptc\.edu\.co$/i;

function resolveCorreo(raw) {
  const t = raw.trim();
  if (UPTC_FULL.test(t))    return t;
  if (UPTC_PARTIAL.test(t)) return `${t}@uptc.edu.co`;
  return null;
}

/* ── Componente ───────────────────────────────────────────────────────────── */
export function LoginPage() {
  const { login, loading, error: authError } = useAuth();

  const [correo, setCorreo]         = useState("");
  const [password, setPassword]     = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [localError, setLocalError] = useState("");
  const [suggestion, setSuggestion] = useState("");

  const passRef = useRef(null);

  useEffect(() => {
    const v = correo.trim();
    if (!v || correo.includes("@")) { setSuggestion(""); return; }
    setSuggestion(UPTC_PARTIAL.test(v) ? `${v}@uptc.edu.co` : "");
  }, [correo]);

  const handleSubmit = async () => {
    setLocalError("");
    const resolved = resolveCorreo(correo);
    if (!resolved) { setLocalError("Correo inválido. Usa el formato usuario@uptc.edu.co"); return; }
    if (!password.trim()) { setLocalError("Ingresa tu contraseña."); return; }
    try {
      await login(resolved, password);
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleCorreoKey = (e) => {
    if ((e.key === "Tab" || e.key === "ArrowRight") && suggestion) {
      e.preventDefault();
      setCorreo(suggestion);
      setSuggestion("");
      passRef.current?.focus();
    }
    if (e.key === "Enter" && !loading) handleSubmit();
  };

  const displayError = localError || authError;
  const correoOk = UPTC_FULL.test(correo.trim());
  return (
    <div className="lp-screen">
      <div className="lp-bg">
        <div className="lp-bg__orb lp-bg__orb--1" />
        <div className="lp-bg__orb lp-bg__orb--2" />
        <div className="lp-bg__orb lp-bg__orb--3" />
        <div className="lp-bg__grid" />
      </div>

      <div className="lp-card animate-slideUp">

        {/* Brand */}
        <div className="lp-brand">
          <div className="lp-brand__badge">
            <span className="lp-brand__letter">S</span>
          </div>
          <div className="lp-brand__text">
            <h1 className="lp-brand__name font-syne">SGED</h1>
            <p className="lp-brand__sub">Sistema de Gestión de Espacios Deportivos</p>
          </div>
        </div>

        <div className="lp-divider" />

        {/* Form */}
        <div className="lp-form">

          {/* Correo */}
          <div className="lp-field">
            <label className="lp-label">
              Correo institucional <span className="lp-label__req">*</span>
            </label>
            <div className="lp-input-wrap">
              {suggestion && (
                <div className="lp-hint" aria-hidden="true">
                  <span style={{ opacity: 0 }}>{correo}</span>
                  <span className="lp-hint__tail">{suggestion.slice(correo.length)}</span>
                </div>
              )}
              <span className="lp-input-icon-left"><IcoMail /></span>
              <input
                className="lp-input"
                type="text"
                placeholder="usuario o usuario@uptc.edu.co"
                value={correo}
                onChange={(e) => { setCorreo(e.target.value); setLocalError(""); }}
                onKeyDown={handleCorreoKey}
                disabled={loading}
                autoComplete="email"
                spellCheck={false}
              />
              {correoOk && (
                <span className="lp-input-badge lp-input-badge--ok"><IcoCheck /></span>
              )}
            </div>
            {suggestion && (
              <p className="lp-hint-tip">
                Presiona <kbd>Tab</kbd> para completar con <em>@uptc.edu.co</em>
              </p>
            )}
          </div>

          {/* Contraseña */}
          <div className="lp-field">
            <label className="lp-label">
              Contraseña <span className="lp-label__req">*</span>
            </label>
            <div className="lp-input-wrap">
              <span className="lp-input-icon-left"><IcoLock /></span>
              <input
                ref={passRef}
                className="lp-input"
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLocalError(""); }}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="lp-input-icon-right"
                onClick={() => setShowPass((v) => !v)}
                tabIndex={-1}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPass ? <IcoEyeOff /> : <IcoEye />}
              </button>
            </div>
          </div>

          {/* Error */}
          {displayError && (
            <div className="lp-error animate-slideIn">
              <IcoAlert />
              <span>{displayError}</span>
            </div>
          )}

          {/* Submit */}
          <button className="lp-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <><span className="lp-spinner" /> Autenticando…</>
            ) : (
              <>Ingresar al sistema <IcoArrow /></>
            )}
          </button>
        </div>

        <p className="lp-footer">
          <IcoShield />
          Acceso SSO institucional · UPTC Sogamoso · Ley 1581 de 2012
        </p>
      </div>
    </div>
  );
}