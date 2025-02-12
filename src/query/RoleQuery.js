const getDataPermissionGroupDataQuery = `
SELECT 
  user_group.id AS group_id, 
  user_group.*, 
  roles.id AS roles_id, 
  roles.*
FROM user_group
LEFT JOIN roles ON user_group.Role_id = roles.id
WHERE user_group.Role_id = ?
`;

const getDataPermissionUserIdDataQuery = `
SELECT 
  permissions_group.id AS permissions_group_id, 
  permissions_group.*, 
  roles.id AS roles_id, 
  roles.*
FROM permissions_group
LEFT JOIN  roles ON permissions_group.group_id = roles.id
WHERE permissions_group.user_id = ?
`;
const insertQueryRoleUser = `
INSERT INTO user_group (permission_id, Role_id) 
VALUES (?, ?)
`;
const deleteQueryRoleUser = `
DELETE FROM user_group 
WHERE id = ?
`;
const selectQueryRole = "SELECT * FROM roles";
const insertRoleQuery = "INSERT INTO roles (group_name) VALUES (?)";
const insertQueryRolePermission = `
INSERT INTO permissions_group (permission_id, group_id, user_id) 
VALUES (?, ?, ?)
`;
const getDataRoleAndPermissionQuery = `SELECT * FROM user_group WHERE Role_id = ?`;
module.exports = {
  getDataPermissionGroupDataQuery,
  insertQueryRoleUser,
  deleteQueryRoleUser,
  selectQueryRole,
  insertRoleQuery,
  insertQueryRolePermission,
  getDataRoleAndPermissionQuery,
  getDataPermissionUserIdDataQuery
};
