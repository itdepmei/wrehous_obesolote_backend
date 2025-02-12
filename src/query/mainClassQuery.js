const getDataMainClassQuery = `
 SELECT main_class.*, 
             file2.file_name
      FROM main_class
      LEFT JOIN files AS file2 ON file2.insert_id = main_class.mainClass_id AND file2.type_file = 'تصنيف رئيسي';
`;
const getDataMainClassByIdQuery = `
 SELECT main_class.*, 
             file2.file_name
      FROM main_class
      LEFT JOIN files AS file2 ON file2.insert_id = main_class.mainClass_id AND file2.type_file = 'تصنيف رئيسي';
WHERE main_class.mainClass_id = ?
`;
module.exports = { getDataMainClassQuery, getDataMainClassByIdQuery };
