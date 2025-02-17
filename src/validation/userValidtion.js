const validateInput = (body) => {
    const { name, email, phone, jopTitle } =
      body;
    if (
      !name ||
      !email ||
      !phone ||
      !jopTitle 
    ) {
      throw new Error("أدخل البيانات المطلوبة");
    }
    if (phone.length !== 11) {
      throw new Error("رقم الهاتف يجب أن يكون 11 رقم");
    }
  };
  /**
   * Validate and sanitize the input data for user registration.
   * @param {Object} data - The input data to validate and sanitize.
   * @param {string} data.name - The user's name.
   * @param {string} data.phone - The user's phone number.
   * @param {number} data.ministries_id - The ministries id.
   * @param {number} data.entities_id - The entities id.
   * @param {number} data.address_id - The address id.
   * @param {number} data.roleId - The role id.
   * @param {string} [data.password] - The user's password.
   * @param {string} data.email - The user's email.
   * @param {number} data.dataId - The user's id.
   * @returns {Object} - The sanitized data.
   * @throws {Error} - If any of the required fields are missing.
   */
  const validateInputEdit = (data) => {
    const {
      name,
      phone,
      ministries_id,
      entities_id,
      address_id,
      roleId,
      password,
      email,
      dataId,
    } = data;
  
    if (!name || !phone || !ministries_id || !entities_id || !address_id || !roleId || !email || !dataId) {
      throw new Error("Missing required fields");
    }
    return {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password: password ? password.trim() : null,
      ministries_id,
      entities_id,
      address_id,
      roleId,
      dataId,
    };
  };
const validateInputActive = (is_active, user_id, dataId) => {
    if (typeof is_active !== 'boolean' || !user_id || !dataId) {
      throw new Error("Invalid input parameters");
    }
  };

  module.exports = { validateInput, validateInputActive ,validateInputEdit};