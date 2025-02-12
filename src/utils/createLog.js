const createLogEntry = async (connection, masterId, userId, entityId,text) => {
    const insertLogQuery = `
      INSERT INTO log_information (master_id, user_id, entities_id, text)
      VALUES (?, ?, ?, ?)
    `;
    await connection.execute(insertLogQuery, [masterId, userId, entityId, text]);
  };
  
  module.exports=createLogEntry