import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const RoleBasedRedirect = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    // V1.1：多角色 — 以主角色（roles[0]）作为路由分流依据
    const primaryRole = currentUser.roles[0];
    switch (primaryRole) {
      case '信息科管理员':
        navigate('/app/home/overview', { replace: true });
        break;
      case '科室管理员':
      default:
        navigate('/app/home/workbench', { replace: true });
        break;
    }
  }, [currentUser, navigate]);

  return null;
};

export default RoleBasedRedirect;