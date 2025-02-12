const getPagination = (page, limit) => {
    const offset = (page - 1) * limit;
    return { offset, limit };
  };
  module.exports={getPagination};