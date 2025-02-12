const path = require("path");
const { existsSync, unlink } = require("fs");
const fs = require('fs').promises;
const ProcessorFile = async (pathfile, res) => {
  try {
    console.log("Processing file:", pathfile);
    
    if (existsSync(pathfile)) {
      try {
        await fs.unlink(pathfile);
        console.log("File deleted successfully");
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    } else {
      console.error("File does not exist:", pathfile);
    }
  } catch (error) {
    console.error("ProcessorFile error:", error.message);
  }
};


module.exports = ProcessorFile;
