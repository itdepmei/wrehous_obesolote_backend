const getDataBookQuery = `
SELECT 
  stagnant_materials.name_material,
  stagnant_materials.Quantity, 
  stagnant_materials.stagnant_id,
  booking_materials.*
FROM booking_materials
LEFT JOIN stagnant_materials 
  ON booking_materials.material_id = stagnant_materials.stagnant_id 
WHERE booking_materials.id = ?`;
module.exports={getDataBookQuery}