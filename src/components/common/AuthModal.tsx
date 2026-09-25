import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Mail, Lock, ArrowRight, MapPin } from 'lucide-react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  sendResetEmail,
  mapFirebaseUserToPayload,
  firebaseErrorMessage,
} from '../../lib/firebase';

export const AuthModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal, authModalMode, setAuthModalMode, loginWithGooglePayload } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [zone, setZone] = useState('');
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!showAuthModal) {
      setAuthError(null);
      setAuthNotice(null);
      setIsLoadingGoogle(false);
      setIsSubmitting(false);
    }
  }, [showAuthModal]);

  if (!showAuthModal) return null;

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthNotice(null);
    setIsLoadingGoogle(true);
    try {
      const cred = await signInWithGoogle();
      loginWithGooglePayload(mapFirebaseUserToPayload(cred.user), zone);
    } catch (err) {
      setAuthError(firebaseErrorMessage(err));
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setAuthError(null);
    setAuthNotice(null);

    let cleanEmail = email.trim().toLowerCase();
    // Si el usuario puso sólo su nombre o @nombre sin dominio de correo, colocar @ automáticamente
    if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail.replace(/\s+/g, '')}@gmail.com`;
    } else if (cleanEmail.startsWith('@') && !cleanEmail.slice(1).includes('@')) {
      cleanEmail = `${cleanEmail.replace(/^@+/, '').replace(/\s+/g, '')}@gmail.com`;
    }

    if (!password) {
      setAuthError('Ingresá tu contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cred = authModalMode === 'register'
        ? await signUpWithEmail(cleanEmail, password)
        : await signInWithEmail(cleanEmail, password);
      const payload = mapFirebaseUserToPayload(cred.user);
      if (fullName.trim()) payload.name = fullName.trim();
      loginWithGooglePayload(payload, zone);
    } catch (err) {
      setAuthError(firebaseErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setAuthError('Escribí tu correo para recuperar la contraseña.');
      return;
    }
    setAuthError(null);
    setAuthNotice(null);
    try {
      await sendResetEmail(email.trim().toLowerCase());
      setAuthNotice('Te enviamos un correo para restablecer tu contraseña. Revisá tu bandeja.');
    } catch (err) {
      setAuthError(firebaseErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="fixed inset-0" onClick={() => setShowAuthModal(false)} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#141316] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 max-h-[95vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#1a191e] sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#141316] border border-dance-crimson/30 flex items-center justify-center p-1 shrink-0 shadow-glow-crimson">
              <img src="/branding/logo_flame.png" alt="Sale Baile" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {authModalMode === 'organizer'
                  ? 'Acceso para Organizadores'
                  : authModalMode === 'register'
                  ? '¡Bienvenido a Sale Baile!'
                  : 'Iniciar Sesión'}
              </h2>
              <p className="text-xs text-slate-400">
                {authModalMode === 'register'
                  ? 'Crea tu cuenta para acceder a la app'
                  : 'Sale Baile • Comunidad de Baile'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAuthModal(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 bg-[#0e111a]">
          {/* Bienvenida y Explicación de Registro */}
          {authModalMode === 'register' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-dance-crimson/10 via-dance-coral/10 to-transparent border border-dance-crimson/20 text-xs text-slate-300 space-y-1">
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>💃🕺</span> Únete a la comunidad de baile
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Regístrate con tu cuenta de Google o correo para personalizar tus ritmos, guardar favoritos y comprar entradas anticipadas.
              </p>
            </div>
          )}

          {/* Mensaje de error si ocurre */}
          {authError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {authError}
            </div>
          )}

          {/* Mensaje informativo (p. ej. correo de recuperación enviado) */}
          {authNotice && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
              {authNotice}
            </div>
          )}

          {/* Botones Sociales (Pantalla 5 de la Maqueta) */}
          <div className="space-y-2.5 pt-1">
            {/* Google */}
            <button
              type="button"
              disabled={isLoadingGoogle}
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.99] cursor-pointer shadow-md disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.7 1 4 3.5 2.2 7.1l3.7 2.8C6.8 7.3 9.2 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                <path fill="#FBBC05" d="M5.9 14.1c-.2-.7-.4-1.4-.4-2.1s.2-1.4.4-2.1L2.2 7.1C1.4 8.6 1 10.2 1 12s.4 3.4 1.2 4.9l3.7-2.8z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-2.8 0-5.2-1.9-6.1-4.5L2.2 16.6C4 20.3 7.7 23 12 23z"/>
              </svg>
              <span>{isLoadingGoogle ? 'Conectando con Google...' : 'Continuar con Google'}</span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={() => {
                setAuthError('Inicio con Facebook: ingresá tu email abajo para acceder instantáneamente.');
              }}
              className="w-full py-3 px-4 bg-[#1877F2]/15 hover:bg-[#1877F2]/25 border border-[#1877F2]/30 text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.99] cursor-pointer shadow-md"
            >
              <svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Continuar con Facebook</span>
            </button>

            {/* Apple */}
            <button
              type="button"
              onClick={() => {
                setAuthError('Apple ID: ingresá tu correo abajo para acceder directamente.');
              }}
              className="w-full py-3 px-4 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.99] cursor-pointer shadow-md"
            >
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.16c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.98.6-2.61 1.34-.55.63-.99 1.68-.87 2.7 1.01.08 2.03-.52 2.55-1.19z"/>
              </svg>
              <span>Continuar con Apple</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center pt-2">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#0e111a] px-3 text-[11px] text-slate-400 uppercase tracking-wider font-bold shrink-0">
              o con tu email
            </span>
            <div className="border-t border-white/10 w-full" />
          </div>

          {/* Formulario de Ingreso */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authModalMode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Nombre Completo</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre o apodo"
                    className="w-full px-4 py-2.5 bg-[#151a27] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-dance-crimson transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-sky-300 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>Tu Zona / Localidad</span>
                  </label>
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#151a27] border border-sky-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-sky-400 transition-colors"
                  >
                    <option value="">Selecciona tu zona...</option>
                    <optgroup label="Buenos Aires & Conurbano">
                      <option value="Zona Norte (GBA)">📍 Zona Norte (GBA - San Isidro, Vicente López, San Martín, Tigre, Pilar, José C. Paz...)</option>
                      <option value="Zona Sur (GBA)">📍 Zona Sur (GBA - Quilmes, Lanús, Lomas, Avellaneda...)</option>
                      <option value="Zona Oeste (GBA)">📍 Zona Oeste (GBA - Morón, Merlo, Moreno, Castelar, Ramos...)</option>
                      <option value="CABA / Capital Federal">🏙️ CABA / Capital Federal (Palermo, Almagro, Centro...)</option>
                      <option value="La Plata & Gran La Plata">🏛️ La Plata & Gran La Plata</option>
                      <option value="Interior de Buenos Aires">🌾 Interior de Bs. As.</option>
                    </optgroup>
                    <optgroup label="Provincias de Argentina">
                      <option value="Córdoba">🎸 Córdoba</option>
                      <option value="Santa Fe (Rosario / Santa Fe)">🚢 Santa Fe / Rosario</option>
                      <option value="Mendoza & Cuyo">🍇 Mendoza & Cuyo</option>
                      <option value="Tucumán & NOA">☀️ Tucumán & NOA</option>
                      <option value="Salta & Jujuy">🏔️ Salta & Jujuy</option>
                      <option value="Entre Ríos & Litoral">🌿 Entre Ríos & Litoral</option>
                      <option value="Chaco & Corrientes">🌴 Chaco & Corrientes</option>
                      <option value="Patagonia">❄️ Patagonia</option>
                      <option value="Otra zona / Exterior">🌎 Otra zona / Exterior</option>
                    </optgroup>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => {
                    if (email.trim() && !email.includes('@')) {
                      setEmail(`${email.trim().replace(/\s+/g, '')}@gmail.com`);
                    } else if (email.startsWith('@') && !email.slice(1).includes('@')) {
                      setEmail(`${email.replace(/^@+/, '').trim().replace(/\s+/g, '')}@gmail.com`);
                    }
                  }}
                  placeholder="tu@email.com o tu_nombre"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#151a27] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-dance-crimson transition-colors"
                />
              </div>
              {/* Botones de ayuda rápida si sólo pusieron su nombre sin @ */}
              {email.trim().length > 0 && !email.includes('@') && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap animate-fadeIn">
                  <span className="text-[10px] text-slate-400 font-semibold">Toca para agregar @:</span>
                  {['@gmail.com', '@hotmail.com', '@outlook.com'].map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => setEmail(`${email.trim().replace(/^@+/, '')}${domain}`)}
                      className="px-2 py-0.5 rounded-lg bg-dance-crimson/15 hover:bg-dance-crimson/30 text-dance-coral text-[10px] font-bold border border-dance-crimson/30 transition-all active:scale-95 cursor-pointer"
                    >
                      {domain}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#151a27] border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-dance-crimson transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-gradient-to-r from-dance-crimson via-dance-coral to-dance-amber hover:opacity-95 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-glow-crimson transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Procesando…' : authModalMode === 'register' ? 'Crear Cuenta' : 'Ingresar'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {authModalMode === 'login' && (
              <div className="text-right -mt-2">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[11px] text-slate-400 hover:text-dance-crimson transition-colors cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
          </form>

          {/* Toggle modes */}
          <div className="text-center text-xs text-slate-400 pt-1">
            {authModalMode === 'login' ? (
              <p>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setAuthModalMode('register')}
                  className="text-dance-crimson font-bold hover:underline cursor-pointer"
                >
                  Regístrate
                </button>
              </p>
            ) : (
              <p>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setAuthModalMode('login')}
                  className="text-dance-crimson font-bold hover:underline cursor-pointer"
                >
                  Inicia Sesión
                </button>
              </p>
            )}

            <div className="pt-2 border-t border-white/5 mt-3">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Explorar cartelera como visitante →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
