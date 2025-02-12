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

const queryMinistries = `
SELECT 
  ministries.id,
  ministries.ministries,
  (
    SELECT COUNT(*)
    FROM entities 
    WHERE entities.ministries_id = ministries.id
  ) AS entities_count,
  (
    SELECT GROUP_CONCAT(entities.Entities_name SEPARATOR ', ')
    FROM entities 
    WHERE entities.ministries_id = ministries.id
  ) AS entities_name
FROM 
  ministries;`;
const getDataMaterial = `
   SELECT 
              stagnant_materials.name_material,
              stagnant_materials.Quantity,
              state_martial.state_name
          FROM 
              stagnant_materials
          LEFT JOIN
              state_martial ON stagnant_materials.state_matrial_id = state_martial.id;`;
const getDataMaterialByEntityId = `
      SELECT 
              stagnant_materials.name_material,
              stagnant_materials.Quantity,
              state_martial.state_name
          FROM 
              stagnant_materials
          LEFT JOIN
              state_martial ON stagnant_materials.state_matrial_id = state_martial.id
                   WHERE stagnant_materials.Entities_id = ?;`;
const queryMainClass = `
                   SELECT 
                     main_class.mainClass_id,
                     main_class.main_Class_name,
                     (
                       SELECT COUNT(*)
                       FROM sub_class_for_main_class 
                       WHERE sub_class_for_main_class.mainClass_id = main_class.mainClass_id
                     ) AS subclass_count,
                     (
                       SELECT GROUP_CONCAT(sub_class_for_main_class.sub_class_name SEPARATOR ', ')
                       FROM sub_class_for_main_class 
                       WHERE sub_class_for_main_class.mainClass_id = main_class.mainClass_id
                     ) AS subclasses
                   FROM 
                     main_class;`;
module.exports = {
  queryUserData,
  queryMinistries,
  getDataMaterial,
  getDataMaterialByEntityId,
  queryMainClass,
};
