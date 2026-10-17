type ClientMonitoring = typeof import("./sentry-client");

let pending: Promise<ClientMonitoring | null> | undefined;
let loaded: ClientMonitoring | null = null;

export function getLoadedClientMonitoring(): ClientMonitoring | null {
  return loaded;
}

/** Startup and public error boundaries share one SDK load and initialization. */
export function loadClientMonitoring(): Promise<ClientMonitoring | null> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return Promise.resolve(null);

  if (!pending) {
    pending = import("./sentry-client")
      .then((monitoring) => {
        monitoring.initializeClientMonitoring(
          dsn,
          process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
        );
        loaded = monitoring;
        return monitoring;
      })
      .catch((error: unknown) => {
        // No background retries. A later real error may retry initialization.
        pending = undefined;
        throw error;
      });
  }
  return pending;
}

export function reportMonitoringLoadFailure(): void {
  // Do not expose the DSN, original error, or any case/contact information.
  console.warn("MMG error reporting could not be initialized or completed.");
}

/** Queue an early boundary error until the already-started SDK is ready. */
export async function captureClientException(error: unknown): Promise<void> {
  try {
    const monitoring = await loadClientMonitoring();
    monitoring?.captureException(error);
  } catch {
    // Monitoring failure must not prevent the boundary's recovery controls.
    reportMonitoringLoadFailure();
  }
}
