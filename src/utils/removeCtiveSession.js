const { connect } = require("../Config/db");
const jwt = require("jsonwebtoken");
const removeActiveSession=async()=>{
    try {
        const pool = await connect();
        const connection = await pool.getConnection();
        try {
          // Query to get all active sessions
          const activeSessionsQuery =
            "SELECT * FROM active_session_user WHERE is_active_session = true";
    
          const [activeSessions] = await connection.execute(activeSessionsQuery);
          if (activeSessions.length === 0) {
            console.log("No active sessions found.");
            return;
          }
          for (const session of activeSessions) {
            const { refresh_token, user_id } = session;
            console.log(refresh_token, user_id);
            
            try {
              // Verify if the refresh token is expired
              const payload = jwt.verify(refresh_token, process.env.REFRESHTOKEN); // Replace with your secret key
              // If the token is valid, continue to the next session
              console.log(`Session for user ${user_id} is still valid.`);
            } catch (error) {
              // If the token is expired or invalid, delete the session
              if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
                const deleteSessionQuery =
                  "DELETE FROM active_session_user WHERE user_id = ? AND is_active_session = true";
                await connection.execute(deleteSessionQuery, [user_id]);
                console.log(`Expired session for user ${user_id} has been deleted.`);
              }
            }
          }
        } finally {
          connection.release();
        }
      } catch (error) {
        console.error("Error running cron job:", error);
      }
}
module.exports=removeActiveSession