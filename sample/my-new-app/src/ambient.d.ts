declare namespace JSX { interface IntrinsicElements { [elemName: string]: any } }
declare module '*.css' { const classes: { [key: string]: string }; export default classes; }
