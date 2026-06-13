export default function TabIcon({ id }) {
  const props = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "currentColor" };
  if (id === "calc") return (
    <svg {...props}><rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/></svg>
  );
  if (id === "budget") return (
    <svg {...props}><rect x="2" y="14" width="5" height="8" rx="1"/><rect x="9.5" y="9" width="5" height="13" rx="1"/><rect x="17" y="5" width="5" height="17" rx="1"/></svg>
  );
  if (id === "recipes") return (
    <svg {...props}><path d="M12 3C9.5 6 8 9 8 13a4 4 0 008 0c0-4-1.5-7-4-10z"/><rect x="11" y="17" width="2" height="4" rx="1"/></svg>
  );
  if (id === "info") return (
    <svg {...props}><path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm1 13h-2v-7h2v7z"/></svg>
  );
  if (id === "admin") return (
    <svg {...props}><path d="M12 2L4 5.5V11c0 5 3.3 9.7 8 11 4.7-1.3 8-6 8-11V5.5L12 2z"/></svg>
  );
  if (id === "profile") return (
    <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
  );
  if (id === "foof") return (
    <svg {...props}><path d="M7 3c3 0 5 2.3 5 5.1C12 11 9.8 14 7 14s-5-3-5-5.9C2 5.3 4 3 7 3zm10 0c2.8 0 5 2.3 5 5.1C22 11 19.8 14 17 14s-5-3-5-5.9C12 5.3 14 3 17 3z"/><path d="M5 16h14a3 3 0 013 3v2H2v-2a3 3 0 013-3z"/></svg>
  );
  return null;
}
