const ALL_ROLES = ["owner", "admin", "cajero", "mesero", "cocina", "delivery", "cliente"];

const STAFF_ROLES = ["owner", "admin", "cajero", "mesero", "cocina", "delivery"];

const ROLE_HIERARCHY = {
  owner: ALL_ROLES,
  admin: ["admin", "cajero", "mesero", "cocina", "delivery", "cliente"],
  cajero: [],
  mesero: [],
  cocina: [],
  delivery: [],
  cliente: [],
};

export function getAssignableRoles(actorRole) {
  if (!actorRole || !ROLE_HIERARCHY.hasOwnProperty(actorRole)) {
    return [];
  }
  return ROLE_HIERARCHY[actorRole];
}

export function canAssignRole(actorRole, targetRole) {
  if (!actorRole || !targetRole) return false;
  return getAssignableRoles(actorRole).includes(targetRole);
}

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function isOwnerOrAdmin(role) {
  return role === "owner" || role === "admin";
}

export function getRoleDisplayName(role) {
  const names = {
    owner: "Propietario",
    admin: "Administrador",
    cajero: "Cajero",
    mesero: "Mesero",
    cocina: "Cocina",
    delivery: "Delivery",
    cliente: "Cliente",
  };
  return names[role] || role;
}

export function getRoleBadgeVariant(role) {
  if (role === "owner") return "default";
  if (role === "admin") return "secondary";
  if (["cajero", "mesero", "cocina", "delivery"].includes(role)) return "outline";
  return "outline";
}
