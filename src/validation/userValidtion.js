const validateInput = (body) => {
    const { name, password, email, phone, jopTitle, address_id, is_active } =
      body;
    if (
      !name ||
      !password ||
      !email ||
      !phone ||
      !jopTitle ||
      !address_id ||
      !is_active
    ) {
      throw new Error("أدخل البيانات المطلوبة");
    }
    if (phone.length !== 11) {
      throw new Error("رقم الهاتف يجب أن يكون 11 رقم");
    }
  };
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