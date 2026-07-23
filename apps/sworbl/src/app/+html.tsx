// WEB HTML SHELL (expo-router): locks the page to the viewport. Without
// this the document grew to content height (1670px vs an 888px window) —
// the sheet's math uses window height, so the band and PLAY tiles hung
// below the fold (owner: "play buttons are cut off" in Chrome). The app is
// an app: html/body/#root are 100% and the ScrollViews scroll internally.
import React from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { height: 100%; }
              body { overflow: hidden; overscroll-behavior: none; }
              #root { display: flex; height: 100%; flex: 1; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
