import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getApplicationPermissionById } from "../redux/auth/authAction";
import { useDispatch } from "react-redux";
import { getToken, getPermissions, setPermissions } from "../utils/handelCookie";
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

const LoadingSpinner = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

const ProtectedApplicationRoute = ({
  applicationId,
  redirectPath = "/unauthorized",
  applicationPermissions,
  loading,
  setRefresh,
}) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const token = getToken();
  const [isLoadingPermissions, setIsLoadingPermissions] = React.useState(false);

  // Check if we have valid permissions data (first in props, then in cookies)
  const isPermissionsValid = React.useMemo(() => {
    const cookiePermissions = getPermissions();
    const currentPermissions = applicationPermissions?.length > 0 ? applicationPermissions : cookiePermissions;
    return Array.isArray(currentPermissions) && currentPermissions.length > 0;
  }, [applicationPermissions]);

  // Fetch permissions if needed
  React.useEffect(() => {
    const fetchPermissions = async () => {
      if (!isPermissionsValid && token && !isLoadingPermissions) {
        setIsLoadingPermissions(true);
        setRefresh(true);
        try {
          const result = await dispatch(getApplicationPermissionById(token));
          // Store permissions in cookie if fetch was successful
          if (result?.payload?.response) {
            setPermissions(result.payload.response);
          }
        } finally {
          setIsLoadingPermissions(false);
          setRefresh(false);
        }
      }
    };

    fetchPermissions();
  }, [dispatch, token, isPermissionsValid, location, isLoadingPermissions]);
 
  // Check permission for current application (check both Redux state and cookies)
  const hasPermission = React.useMemo(() => {
    if (!isPermissionsValid) return false;
    
    const cookiePermissions = getPermissions();
    const currentPermissions = applicationPermissions?.length > 0 ? applicationPermissions : cookiePermissions;
    
    return currentPermissions?.some(
      permission => Number(permission?.user_id_application__permission_id) === Number(applicationId)
    );
  }, [applicationPermissions, applicationId, isPermissionsValid]);

  // Handle loading state
  if (loading || isLoadingPermissions) {
    return <LoadingSpinner />;
  }

  // Only redirect if we're not loading and don't have permission
  if (!hasPermission && !isLoadingPermissions) {
    return (
      <Navigate 
        to={redirectPath} 
        replace 
        state={{ 
          from: location,
          applicationId,
          message: "You don't have permission to access this application"
        }} 
      />
    );
  }

  // Render authorized content
  return <Outlet />;
};

export default React.memo(ProtectedApplicationRoute);
