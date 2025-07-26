/// <reference types="vite/client" />

declare module '*.json' {
  const value: any;
  export default value;
}

declare module '*.txt' {
  const content: string;
  export default content;
}