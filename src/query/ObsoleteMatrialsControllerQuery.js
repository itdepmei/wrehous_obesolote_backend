const insertQuery = `
      INSERT INTO stagnant_materials 
        (	state_matrial_id , name_material, Entities_id, ministry_id, Quantity, user_id, mainClass_id, subClass_id, measuring_unit_id,typ_material,description,	puchase_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
      `;
const getDataQuery = `
      SELECT 
          stagnant_materials.*,
          sub_class_for_main_class.*,
          main_class.*,
          measuring_unit.measuring_unit,
          users_management.phone_number,
          users_management.user_name,
          entities.Entities_name,
          ministries.ministries,
          state_martial.id AS status_id,
          state_martial.state_name,
          -- Group_concat to get all files with file_name, file ID, insert_id, and file_type
          GROUP_CONCAT(CONCAT(files.file_name, '|', files.id, '|', files.insert_id, '|', files.type_file) SEPARATOR ',') AS image_files,
          -- Count the number of files for each stagnant_material record
          COUNT(files.file_name) AS image_count
      FROM 
          stagnant_materials
          LEFT JOIN 
          sub_class_for_main_class ON stagnant_materials.subClass_id = sub_class_for_main_class.subClass_id
          LEFT JOIN 
          main_class ON stagnant_materials.mainClass_id = main_class.mainClass_id
          LEFT JOIN 
          users_management ON stagnant_materials.user_id = users_management.id
          LEFT JOIN 
          measuring_unit ON stagnant_materials.measuring_unit_id = measuring_unit.unit_id
          LEFT JOIN 
          ministries ON stagnant_materials.ministry_id = ministries.id
          LEFT JOIN 
          entities ON stagnant_materials.Entities_id = entities.id
      LEFT JOIN
          files ON stagnant_materials.stagnant_id = files.insert_id  
      LEFT JOIN
          state_martial ON stagnant_materials.state_matrial_id = state_martial.id  
      WHERE 
          stagnant_materials.Entities_id = ?
      -- Group by the stagnant_materials ID to make sure we get one row per material
      GROUP BY 
          stagnant_materials.stagnant_id
      -- Limit and Offset for pagination
      LIMIT ? OFFSET ?;
      `;
const getDataQuerySearch = `
SELECT 
  sm.*,
  sc.*,
  mc.*,
  um.*,
  mu.*,
  e.*,
  m.*
FROM 
  stagnant_materials sm
LEFT JOIN 
  sub_class_for_main_class sc ON sm.subClass_id = sc.subClass_id
LEFT JOIN 
  main_class mc ON sm.mainClass_id = mc.mainClass_id
LEFT JOIN 
  users_management um ON sm.user_id = um.id
LEFT JOIN 
  measuring_unit mu ON sm.measuring_unit_id = mu.unit_id
LEFT JOIN 
  ministries m ON sm.ministry_id = m.id
LEFT JOIN  
  entities e ON sm.Entities_id = e.id
WHERE 
  sm.mainClass_id = ? 
  AND sm.subClass_id = ? 
  AND sm.Entities_id = ? 
LIMIT ? 
OFFSET ?;

`;

const getDataByMainClassIdQuery = `
  SELECT 
    stagnant_materials.*,
    sub_class_for_main_class.sub_class_name,
        main_class.main_Class_name,
         measuring_unit.measuring_unit,
users_management.phone_number,
users_management.user_name,
    entities.Entities_name,
    ministries.ministries,
           state_martial.id AS status_id,
        state_martial.state_name,
        GROUP_CONCAT(files.file_name) AS image_files,
        
        -- Count the number of images
        COUNT(files.file_name) AS image_count
  FROM 
    stagnant_materials
LEFT JOIN 
    sub_class_for_main_class ON stagnant_materials.subClass_id = sub_class_for_main_class.subClass_id
LEFT JOIN 
    main_class ON stagnant_materials.mainClass_id = main_class.mainClass_id
LEFT JOIN 
    users_management ON stagnant_materials.user_id = users_management.id
LEFT JOIN 
    measuring_unit ON stagnant_materials.measuring_unit_id = measuring_unit.unit_id
LEFT JOIN 
    ministries ON stagnant_materials.ministry_id = ministries.id
    
LEFT JOIN  
    entities ON stagnant_materials.Entities_id = entities.id
      LEFT JOIN
        files ON stagnant_materials.stagnant_id = files.insert_id  
              LEFT JOIN
        state_martial ON stagnant_materials.state_matrial_id  = state_martial.id  
  WHERE 
    stagnant_materials.mainClass_id = ?
      GROUP BY stagnant_materials.stagnant_id
`;
const getAllDataQuery = `
  SELECT 
    stagnant_materials.*,
    sub_class_for_main_class.sub_class_name,
        main_class.main_Class_name,
         measuring_unit.measuring_unit,
users_management.phone_number,
users_management.user_name,
    entities.Entities_name,
       state_martial.id AS status_id,
        state_martial.state_name,
    ministries.*
  FROM 
    stagnant_materials
LEFT JOIN 
    sub_class_for_main_class ON stagnant_materials.subClass_id = sub_class_for_main_class.subClass_id
LEFT JOIN 
    main_class ON stagnant_materials.mainClass_id = main_class.mainClass_id
LEFT JOIN 
    users_management ON stagnant_materials.user_id = users_management.id
LEFT JOIN 
    measuring_unit ON stagnant_materials.measuring_unit_id = measuring_unit.unit_id
LEFT JOIN 
    ministries ON stagnant_materials.ministry_id = ministries.id
LEFT JOIN  
    entities ON stagnant_materials.Entities_id = entities.id
          LEFT JOIN
        state_martial ON stagnant_materials.state_matrial_id  = state_martial.id  
 ORDER BY stagnant_id ASC
`;
const getDataByStagnantIdQuery = `
  SELECT 
    stagnant_materials.*,
    users_management.phone_number,
    sub_class_for_main_class.sub_class_name,
        main_class.main_Class_name,
         measuring_unit.measuring_unit,
users_management.phone_number,
users_management.user_name,
       entities.Entities_name,
        ministries.ministries,
           state_martial.id AS status_id,
        state_martial.state_name,
        GROUP_CONCAT(files.file_name) AS image_files,
        -- Count the number of images
        COUNT(files.file_name) AS image_count
  FROM 
    stagnant_materials
 LEFT JOIN 
    sub_class_for_main_class ON stagnant_materials.subClass_id = sub_class_for_main_class.subClass_id
 LEFT JOIN 
    main_class ON stagnant_materials.mainClass_id = main_class.mainClass_id
 LEFT JOIN 
    users_management ON stagnant_materials.user_id = users_management.id
 LEFT JOIN 
    measuring_unit ON stagnant_materials.measuring_unit_id = measuring_unit.unit_id
 LEFT JOIN 
    ministries ON stagnant_materials.ministry_id = ministries.id
 LEFT JOIN  
    entities ON stagnant_materials.Entities_id = entities.id
      LEFT JOIN
        files ON stagnant_materials.stagnant_id = files.insert_id  
              LEFT JOIN
        state_martial ON stagnant_materials.state_matrial_id  = state_martial.id  
  WHERE 
    stagnant_materials.stagnant_id = ?
      GROUP BY stagnant_materials.stagnant_id
`;
const getDataByIdStagnantQuery =
  "SELECT* FROM stagnant_materials WHERE stagnant_id=?";
const updateQuery = `
UPDATE stagnant_materials 
SET
  state_matrial_id= ?,
  name_material = ?,
  Entities_id = ?,
  ministry_id = ?,
  price_material = ?,
  Quantity = ?,
  mainClass_id = ?,
  subClass_id = ?,
  measuring_unit_id = ?,
  description=?
WHERE stagnant_id = ?
`;
const deleteItem = "DELETE FROM stagnant_materials WHERE stagnant_id = ?";
module.exports = {
  getDataQuery,
  updateQuery,
  deleteItem,
  insertQuery,
  getAllDataQuery,
  getDataByIdStagnantQuery,
  getDataByMainClassIdQuery,
  getDataByStagnantIdQuery,
  getDataQuerySearch,
};
