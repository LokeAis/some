// Offentleg Firebase web-konfigurasjon (IKKJE hemmeleg – vert sendt til nettlesaren uansett).
// Einaste kjelde til sanning, delt av både frontend (src/lib/firebase.ts) og
// server (api/routes.ts). Tryggleiken ligg i firestore.rules, ikkje i desse verdiane.
//
// Som ein vanleg TS-modul (ikkje JSON-import) resolverer dette likt i alle miljø:
// Vite, tsx, esbuild OG Vercel sin per-fil ESM-kompilering.
export const firebaseConfig = {
  projectId: "landingsidejkn",
  appId: "1:361817484614:web:b279a67bed65d30ae64947",
  apiKey: "AIzaSyCjpfbxeZ2PfOaYwP6IXi8-zJFHHCVc2RQ",
  authDomain: "landingsidejkn.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-9b874cc7-d96c-4baa-9b6a-027c074da428",
  storageBucket: "landingsidejkn.firebasestorage.app",
  messagingSenderId: "361817484614",
  measurementId: "",
};
