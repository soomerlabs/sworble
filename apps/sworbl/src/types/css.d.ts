// The SDK 57 template ships .css/.module.css imports without declarations —
// Metro handles them at bundle time; these declarations make `tsc --noEmit` clean.
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
declare module '*.css';
