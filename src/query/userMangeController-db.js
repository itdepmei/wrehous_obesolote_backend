const getDataUsersById = `
  SELECT 
    users_management.id AS user_id, 
    users_management.*, 
    roles.id AS roles_id, 
    entities.Entities_name, 
    ministries.id AS minister_id,
    active_user.is_active,
     governorate.id AS address_id,
    active_user.user_id AS active_user_id
  FROM 
    users_management
  LEFT JOIN 
    entities ON users_management.entities_id = entities.id
  LEFT JOIN 
    roles ON users_management.group_id = roles.id
  LEFT JOIN 
    ministries ON users_management.ministres_id = ministries.id
      LEFT JOIN 
    active_user ON users_management.id = active_user.user_id
    LEFT JOIN 
     governorate ON users_management.address_id = governorate.id
  WHERE 
    users_management.id = ?
`;
const getDataUsersDataQuery = `
  SELECT 
    users_management.id AS user_id, 
    users_management.*, 
    entities.id AS entity_id, 
    entities.*, 
    ministries.id AS minister_id, 
    ministries.*, 
    roles.id AS roles_id, 
  roles.*
  FROM users_management
  LEFT JOIN  entities ON users_management.entities_id = entities.id
  LEFT JOIN  ministries ON users_management.ministres_id = ministries.id
  LEFT JOIN  roles ON users_management.group_id = roles.id
  `;
const updateQuery = `
UPDATE users_management 
SET
  user_name = ?, 
  phone_number = ?, 
  ministres_id  = ?, 
  entities_id = ?, 
  address_id = ?
WHERE id = ?
`;
const deleteItem = "DELETE FROM users_management WHERE id = ?";
const getInformation = " SELECT * FROM users_management WHERE id = ?";

const getUserByIdQuery2 = `
SELECT 
  users_management.id AS user_id, 
  users_management.user_name,
  entities.Entities_name,
  entities.id AS entity_id,
  job_title.job_name,
  job_title.id AS job_id,
  governorate.governorate_name,
  governorate.id AS address_id
FROM users_management
LEFT JOIN entities ON users_management.entities_id = entities.id
LEFT JOIN job_title ON users_management.job_title_id = job_title.id
LEFT JOIN governorate ON users_management.address_id = governorate.id
WHERE users_management.id = ?
`;
const getDataUsersQuery = `
SELECT 
  um.id AS user_id, um.*, 
  r.id AS role_id, r.*
FROM users_management um
LEFT JOIN roles r ON um.group_id = r.id
WHERE um.entities_id = ? AND r.id = '2'
`;
// fetch data user report
const queryUserData = `
SELECT 
  users_management.id AS user_id, 
  users_management.user_name, 
  users_management.create_At, 
  users_management.phone_number, 
  users_management.email, 
  entities.id AS entity_id, 
  entities.Entities_name, 
  job_title.job_name,
  job_title.id AS job_id,
  governorate.governorate_name,
  governorate.id AS address_id,
  ministries.id AS minister_id, 
  ministries.ministries, 
  roles.id AS roles_id, 
  roles.group_name
FROM users_management
LEFT JOIN entities ON users_management.entities_id = entities.id
LEFT JOIN ministries ON users_management.ministres_id = ministries.id
LEFT JOIN roles ON users_management.group_id = roles.id
LEFT JOIN job_title ON users_management.job_title_id = job_title.id
LEFT JOIN governorate ON users_management.address_id = governorate.id;`;

module.exports = {
  getDataUsersDataQuery,
  updateQuery,
  deleteItem,
  getDataUsersById,
  getInformation,
  getUserByIdQuery2,
  getDataUsersQuery,
  queryUserData,
};
