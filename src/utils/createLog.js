const createLogEntry = async (connection, masterId, userId, entityId,text ,category_id) => {
    const insertLogQuery = `
      INSERT INTO log_information (master_id, user_id, entities_id, text,category_id)
      VALUES (?, ?, ?, ?,?)
    `;
    await connection.execute(insertLogQuery, [masterId, userId, entityId, text,category_id]);
  };
  
  module.exports=createLogEntry