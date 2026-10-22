const LoadingScreen = ({ message = "Verificando sesión" }) => (
  <main className="loading-screen" aria-live="polite" aria-busy="true">
    <span className="loading-spinner" aria-hidden="true" />
    <p>{message}</p>
  </main>
);

export default LoadingScreen;
