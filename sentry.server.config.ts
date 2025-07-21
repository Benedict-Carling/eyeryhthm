// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://4378adc8f35443335461888ccf44ffd9@o4509708283215872.ingest.de.sentry.io/4509708284330064",

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
