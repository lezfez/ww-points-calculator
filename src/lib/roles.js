export const ROLE_RANK = { guest: 0, user: 1, premium: 2, admin: 3 };
export const ROLE_LABELS = { guest: "Gast", user: "Registriert", premium: "Premium", admin: "Admin" };
export const ROLE_OPTIONS = ["user", "premium", "admin"];

export function getUserRole(user, isSignedIn) {
  if (!isSignedIn || !user) return "guest";
  const meta = user.publicMetadata || {};
  if (meta.role === "admin") return "admin";
  if (meta.role === "premium" || meta.isPremium === true) return "premium";
  return "user";
}

export function hasAccess(requiredRole, userRole) {
  return (ROLE_RANK[userRole] || 0) >= (ROLE_RANK[requiredRole] || 0);
}
