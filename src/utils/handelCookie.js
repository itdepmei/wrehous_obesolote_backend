const Cookies = require('js-cookie');

// Get token from cookie
export const getToken = () => {
    return Cookies.get('token');
};

// Set token in cookie
export const setToken = (token) => {
    Cookies.set('token', token);
};

// Set permissions in cookie
export const setPermissions = (permissions) => {
    Cookies.set('applicationPermissions', JSON.stringify(permissions));
};

// Get permissions from cookie
export const getPermissions = () => {
    const permissions = Cookies.get('applicationPermissions');
    return permissions ? JSON.parse(permissions) : null;
};

// Remove all auth related cookies
export const removeAuthCookies = () => {
    Cookies.remove('token');
    Cookies.remove('applicationPermissions');
};
