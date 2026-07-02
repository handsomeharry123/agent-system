import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ProLayout } from '@ant-design/pro-layout';
import { Dropdown, Avatar, Space, message, Typography } from 'antd';
import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { useDemoSettings } from '../hooks/useDemoSettings';
import { resolveMenu, masterMenu, isModuleVisible, isSubPageVisible } from '../config/masterMenu';
import { DemoSettingsPanel } from '../components/DemoFloatButton';
// V1 智能化升级（§3.1.1）：全局「智能填写助手」悬浮入口 + 对话浮层
import AgentAssistant from '../pages/agent-center/smart/AgentAssistant';
import { SmartDraftProvider } from '../pages/agent-center/smart/store.tsx';

const { Text } = Typography;

const isDemoModeEnabled = (): boolean => {
  // 显式 false / 'false' 关闭；其余一律开启（开发默认值）
  const flag = import.meta.env.VITE_DEMO_MODE;
  if (flag === undefined || flag === null || flag === '') return true;
  return String(flag).toLowerCase() !== 'false';
};

const BasicLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [demoPanelOpen, setDemoPanelOpen] = useState(false);
  const { currentUser } = useAuth();
  const { visibleModules, visibleSubPages, demoRole } = useDemoSettings();

  const demoMode = isDemoModeEnabled();

  // 根据 demo 角色 + 模块显隐集合计算最终菜单
  // 2 角色可见性维度：信息科管理员 = itAdmin；科室管理员 = itUser
  const filteredMenuItems = useMemo(
    () => resolveMenu(visibleModules, visibleSubPages, demoRole === '信息科管理员' ? 'itAdmin' : 'itUser'),
    [visibleModules, visibleSubPages, demoRole],
  );

  // 当前所在模块若被关闭 / 角色无权，自动跳转到一个安全的落地页
  // 安全的落地页 = 当前角色基线可见的页面：信息科管理员 → 首页；科室管理员 → 工作台
  // V2.0：用 ref 记录"已提示过的拦截目标"，避免 React 18 StrictMode 下 effect 双跑 / 同一次访问重弹 message
  const warnedForRef = useRef<string>('');
  useEffect(() => {
    if (!currentUser) return;
    const path = location.pathname;
    // 找出当前路径所属的模块（精确路径匹配或前缀匹配）
    const ownerModule = masterMenu.find((m) => {
      if (path === m.path) return true;
      if (m.children?.some((s) => s.path === path)) return true;
      if (path.startsWith(m.path + '/')) return true;
      return false;
    });
    if (!ownerModule) return;

    // 计算当前角色下「安全的」回退路径
    // 2 角色：信息科管理员 → 首页；科室管理员 → 工作台
    const safeFallback = demoRole === '信息科管理员' ? '/app/home/overview' : '/app/home/workbench';

    // 统一判定：与 resolveMenu / 演示树 共用 isModuleVisible / isSubPageVisible
    // 涵盖「用户取消勾选」与「角色基线屏蔽」两种情况
    // V1.7 扩展：模块对某角色可见、但子页面对该角色屏蔽时，也要强制回退
    // （如科室管理员访问「评测沙盒/指标展示」这类仅管理员子页）
    const roleKey = demoRole === '信息科管理员' ? 'itAdmin' : 'itUser';
    const moduleBlocked = !isModuleVisible(ownerModule, visibleModules, roleKey);
    // 路径归属子页面判定：精确路径匹配 或 路径以子页面 path + '/' 开头
    // （覆盖子页面的详情/创建/导入等嵌套路由）
    const subPage = ownerModule.children?.find(
      (s) => path === s.path || path.startsWith(s.path + '/'),
    );
    const subPageBlocked = subPage
      ? !isSubPageVisible(ownerModule, subPage, visibleModules, visibleSubPages, roleKey)
      : false;
    if (moduleBlocked || subPageBlocked) {
      if (path !== safeFallback) {
        // V2.0：被演示设置隐藏时给出明确提示，避免"看起来被拒绝访问"
        // 区分两种拦截原因：模块级取消勾选 / 子页面取消勾选 / 角色基线无权限
        const reason = moduleBlocked
          ? subPage
            ? `「${ownerModule.name} / ${subPage.name}」`
            : `「${ownerModule.name}」`
          : `「${ownerModule.name} / ${subPage?.name ?? ''}」`;
        const cause = moduleBlocked
          ? (visibleModules[ownerModule.key] === false ? '已被演示设置取消勾选' : '当前角色无权访问')
          : '已被演示设置取消勾选';
        // 同一拦截目标（path + reason）只弹一次，避免 React 18 StrictMode 双弹 + 用户手动重试重复提示
        const warnedKey = `${path}::${reason}`;
        if (warnedForRef.current !== warnedKey) {
          warnedForRef.current = warnedKey;
          message.warning(`${reason} ${cause}，已自动跳转。点击右上角头像 →「演示功能」可恢复。`, 4);
        }
        navigate(safeFallback, { replace: true });
      } else {
        // 已抵达安全落地页，重置 warned 标记，下一次重新进入才会再次提示
        warnedForRef.current = '';
      }
    } else {
      // 当前路径未触发拦截，重置 warned 标记
      warnedForRef.current = '';
    }
  }, [location.pathname, visibleModules, visibleSubPages, demoRole, currentUser, navigate]);

  const isItAdmin = currentUser?.roles.includes('信息科管理员') ?? false;

  // V1.1：身份免维护 + SSO 单点登录，用户基础信息与密码均由医院侧维护
  // 头像菜单保留「退出登录」；演示模式开启时，在上方加「演示功能」入口
  const userMenuItems: MenuProps['items'] = demoMode
    ? [
        {
          key: 'demo',
          icon: <SettingOutlined />,
          label: '演示功能',
        },
        { type: 'divider' as const },
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: '退出登录',
          danger: true,
        },
      ]
    : [
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: '退出登录',
          danger: true,
        },
      ];

  const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'demo':
        setDemoPanelOpen(true);
        break;
      case 'logout':
        message.success('已退出登录');
        navigate('/login');
        break;
    }
  };

  const renderHeaderContent = () => (
    <Space size={16} align="center">
      {/* 右上角角色名称：与演示角色切换联动，admin / 李秀英 等 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px',
          borderRadius: 16,
          background: '#F0F5FF',
          border: '1px solid #ADC6FF',
          cursor: 'default',
        }}
        title={`当前演示用户：${currentUser?.name ?? '-'}（${demoRole}）`}
      >
        <UserOutlined style={{ color: '#1677FF' }} />
        <Text style={{ fontSize: 13, color: '#1677FF', fontWeight: 500 }}>
          {currentUser?.name ?? '-'}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          · {demoRole}
        </Text>
      </div>
      <Dropdown
        menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
        placement="bottomRight"
        trigger={['click']}
      >
        <Avatar
          style={{ backgroundColor: '#1677FF', cursor: 'pointer' }}
          icon={<UserOutlined />}
        />
      </Dropdown>
    </Space>
  );

  const menuItemRender = (item: any, dom: React.ReactNode) => {
    return (
      <div
        onClick={() => {
          if (item.path) {
            navigate(item.path);
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        {dom}
      </div>
    );
  };

  return (
    <ProLayout
      title="医疗智能体管理平台"
      logo="/logo.svg"
      location={location}
      menuDataRender={() => filteredMenuItems as any}
      collapsed={collapsed}
      onCollapse={setCollapsed}
      siderWidth={240}
      layout="mix"
      contentWidth="Fluid"
      fixedHeader
      splitMenus={false}
      headerContentRender={() => (
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {/* Header content managed by rightContentRender */}
        </div>
      )}
      rightContentRender={() => renderHeaderContent()}
      onMenuHeaderClick={() => navigate('/app/home/workbench')}
      menuItemRender={menuItemRender}
    >
      <div
        style={{
          background: '#F5F5F5',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {/* V1 智能化升级：§3.1.1 全局 Agent 对话浮层 + 草稿 store
           —— Provider 必须包住 Outlet, 让 SmartRegistrationForm (通过 React Router 渲染)
              也能 useSmartDraft() 拿到 store */}
        <SmartDraftProvider>
          <Outlet />
          <AgentAssistant />
          {/* 演示设置抽屉: 由右上角头像下拉菜单的「演示功能」项触发,
              仅在 VITE_DEMO_MODE 开启时挂载, 生产环境不渲染 */}
          {demoMode && (
            <DemoSettingsPanel
              open={demoPanelOpen}
              onClose={() => setDemoPanelOpen(false)}
            />
          )}
        </SmartDraftProvider>
      </div>
    </ProLayout>
  );
};

export default BasicLayout;
