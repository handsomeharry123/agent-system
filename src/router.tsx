import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RouteObject } from 'react-router';

// Layouts
import PortalLayout from './layouts/PortalLayout';
import BasicLayout from './layouts/BasicLayout';

// Pages - Portal
import Home from './pages/portal/Home';
import Agents from './pages/portal/Agents';
import AgentDetail from './pages/portal/AgentDetail';
import Help from './pages/portal/Help';
import Login from './pages/portal/Login';
import Register from './pages/portal/Register';

// Pages - App (Platform)
import HomePage from './pages/home';
import Workbench from './pages/home/Workbench';
import Dashboard from './pages/home/Dashboard';
import AutoTaskForm from './pages/home/AutoTaskForm';
import RoleBasedRedirect from './components/RoleBasedRedirect';

// Pages - Agent Needs（V1.0 智能体建设需求管理：需求管理列表 / 草稿 / 生成需求 / 详情 / 文档预览）
import AgentNeeds from './pages/agent-needs/index';
import AgentNeedForm from './pages/agent-needs/NeedForm';
import AgentNeedDetail from './pages/agent-needs/Detail';
import AgentNeedDoc from './pages/agent-needs/DocPreview';

// Pages - Agent Center（V2.2：注册管理下分 4 个下转路由页）
import AgentCenter from './pages/agent-center/index';
import AgentRegistration from './pages/agent-center/Registration';
import AgentRegistrationDetail from './pages/agent-center/Detail';
import AgentRegistrationAudit from './pages/agent-center/Audit';
// V1 智能化升级（§3.1.1 + §3.1.2）：对话浮层 + 智能填写版新建注册页
import SmartRegistrationForm from './pages/agent-center/smart/SmartRegistrationForm';

// Pages - Ledger
import Ledger from './pages/ledger/index';
import LedgerList from './pages/ledger/List';
import LedgerDetail from './pages/ledger/Detail';
import RiskLevelPage from './pages/ledger/RiskLevel';
// 智能化升级 Demo(§3.1-3.3)
import LedgerDemo from './pages/ledger/demo';
import DemoOverviewV31 from './pages/ledger/demo/OverviewV31';
import DemoProfileV32 from './pages/ledger/demo/AgentProfileV32';
import DemoReportV34 from './pages/ledger/demo/ReportV34';
import DemoAgentListV32 from './pages/ledger/demo/AgentListV32';

// Pages - Resource Center (V1.0 医院资源管理中心)
import ResourceCenter from './pages/resource-center/index';
import ResourceList from './pages/resource-center/Resources';
import ResourceForm from './pages/resource-center/ResourceForm';
import ResourceDrafts from './pages/resource-center/Drafts';
import ApplyList from './pages/resource-center/Applies';
import ApplyForm from './pages/resource-center/ApplyForm';
import Approval from './pages/resource-center/Approval';
import ApplyDetail from './pages/resource-center/ApplyDetail';

// Pages - Evaluation (V1.6)
import Evaluation from './pages/evaluation/index';
import Tasks from './pages/evaluation/Tasks';
import CreateTask from './pages/evaluation/CreateTask';
import ProgressDetail from './pages/evaluation/Progress';
import EvaluationReport from './pages/evaluation/Report';
import Indicators from './pages/evaluation/Indicators';
import Datasets from './pages/evaluation/Datasets';
import ImportDataset from './pages/evaluation/ImportDataset';
import ImportQuestions from './pages/evaluation/ImportQuestions';
import EvaluationDatasetDetail from './pages/evaluation/EvaluationDatasetDetail';
import TaskReview from './pages/evaluation/TaskReview';

// Pages - Orchestration
import Orchestration from './pages/orchestration/index';
import Scenes from './pages/orchestration/Scenes';
import Flows from './pages/orchestration/Flows';
import FlowEditor from './pages/orchestration/FlowEditor';

// Pages - Monitoring (V1.8 重构：6 个一级入口 + 5/6 子页)
import Monitoring, {
  Overview,
  BusinessV18,
  StatusV18,
  CostV18,
  AlertEventListV18,
  AlertEventAssign,
  AlertEventHandle,
  AlertEventReview,
  AlertEventDetail,
  RuleManage as MonitoringRuleManage,
  RuleForm as MonitoringRuleForm,
  RuleDetail as MonitoringRuleDetail,
} from './pages/monitoring';
// 性能维度已并入三维（业务/状态/成本），旧 Performance 页面下线

// Pages - Security
import Security from './pages/security/Overview';
import EventManage from './pages/security/EventManage';
import RuleManage from './pages/security/RuleManage';
import SecurityAlertRuleForm from './pages/security/SecurityAlertRuleForm';

// Pages - Data Asset (v1.3: 数据集资产列表 + 采集任务列表 两个一级入口，8 个 P0 页面)
import DataAssetOverview from './pages/data-asset/Overview';
// 数据集资产列表入口
import DatasetList from './pages/data-asset/DatasetList';
import DatasetDetail from './pages/data-asset/DatasetDetail';
import DatasetPreview from './pages/data-asset/DatasetPreview';
// 采集任务列表入口
import CollectionTaskList from './pages/data-asset/CollectionTaskList';
import CollectionTaskForm from './pages/data-asset/CollectionTaskForm';
import CollectionLogList from './pages/data-asset/CollectionLogList';

// Pages - User Center
import UserCenter from './pages/user-center/UserList';
import RoleManage from './pages/user-center/RoleManage';
import FunctionPermission from './pages/user-center/FunctionPermission';
import DataPermission from './pages/user-center/DataPermission';

// Pages - Notifications
import NotificationList from './pages/notifications';

// Pages - Audit
import Audit from './pages/audit/LogList';

// Pages - Data Dictionary (V1.0 需求说明书)
import DictCategoryList from './pages/dict/CategoryList';
import DictItemList from './pages/dict/ItemList';

// Pages - Environment (V1.1 需求说明书：沙盒/正式两个独立页面)
import SandboxPage from './pages/environment/SandboxPage';
import ProductionPage from './pages/environment/ProductionPage';

const routes: RouteObject[] = [
  // Public routes with PortalLayout
  {
    path: '/',
    element: <PortalLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'agents', element: <Agents /> },
      { path: 'agents/:id', element: <AgentDetail /> },
      { path: 'help', element: <Help /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
    ],
  },
  // Platform routes with BasicLayout (protected)
  {
    path: '/app',
    element: <BasicLayout />,
    children: [
      // 默认落地页：根据角色动态跳转（管理员到首页，普通用户到工作台）
      { index: true, element: <RoleBasedRedirect /> },
      // Home - 首页（仅管理员通过侧边栏访问）
      {
        path: 'home',
        children: [
          { index: true, element: <Navigate to="/app/home/overview" replace /> },
          { path: 'overview', element: <HomePage /> },
          { path: 'workbench', element: <Workbench /> },
          { path: 'dashboard', element: <Dashboard /> },
          // 两个工作台入口必须由 HomePage 承载，避免直接路由只渲染裸列表、丢失第二层功能栏。
          { path: 'connector', element: <HomePage /> },
          { path: 'auto-tasks', element: <HomePage /> },
          { path: 'auto-tasks/new', element: <AutoTaskForm /> },
        ],
      },
      // Agent Center（V2.2：注册管理下分 4 个下转路由页）
      {
        path: 'agent-needs',
        children: [
          // 1.1 需求管理页 + 1.3 草稿页（顶部 Tab 切换，默认「需求管理列表」）
          { index: true, element: <AgentNeeds /> },
          // 1.2 生成需求页
          { path: 'create', element: <AgentNeedForm /> },
          // 1.2 编辑草稿（带入草稿全部字段）
          { path: 'edit/:id', element: <AgentNeedForm /> },
          // 1.4 需求详情页（只读 + 最新匹配结果）
          { path: 'detail/:id', element: <AgentNeedDetail /> },
          // 需求文档在线预览（可下载 Word / PDF）
          { path: 'doc/:id', element: <AgentNeedDoc /> },
        ],
      },
      {
        path: 'agent-center',
        children: [
          { index: true, element: <AgentCenter /> },
          // 1.2 新建注册（单页三段：备案材料 / 基本信息 / 技术信息）
          { path: 'register', element: <AgentRegistration /> },
          // 1.2 编辑注册（草稿 / 退回修改 / 撤销修改 重提）
          { path: 'edit/:id', element: <AgentRegistration /> },
          // 1.3 注册信息详情
          { path: 'detail/:id', element: <AgentRegistrationDetail /> },
          // 1.4 审核注册
          { path: 'audit/:id', element: <AgentRegistrationAudit /> },
          // V1 智能化升级：§3.1.2 新建注册（智能填写）—— Agent 对话浮层 + AI 预填版
          { path: 'smart-register', element: <SmartRegistrationForm /> },
        ],
      },
      // Ledger
      {
        path: 'ledger',
        children: [
          { index: true, element: <Ledger /> },
          { path: 'list', element: <LedgerList /> },
          { path: 'detail/:id', element: <LedgerDetail /> },
          // V1.5 风险分级页（初判 / 人工审核）
          { path: 'risk/:id', element: <RiskLevelPage /> },
          // V1.5 已下线「权限治理」路由；权限治理统一收敛至「统一安全治理中心」
        ],
      },
      // 智能化升级 Demo（§3.1-3.3）：独立路由,带 Tabs 切换 3 个子页
      {
        path: 'ledger-demo',
        element: <LedgerDemo />,
        children: [
          { index: true, element: <Navigate to="/app/ledger-demo/overview" replace /> },
          { path: 'overview', element: <DemoOverviewV31 /> },
          { path: 'list', element: <DemoAgentListV32 /> },
          { path: 'profile', element: <DemoProfileV32 /> },
          { path: 'report', element: <DemoReportV34 /> },
        ],
      },
      // Resource Center (V1.0 医院资源管理中心)
      {
        path: 'resource-center',
        children: [
          { index: true, element: <ResourceCenter /> },
          // 1.1 资源管理(含「所有资源 / 草稿」双 Tab)
          { path: 'resources', element: <ResourceList /> },
          // 1.2 注册资源(新增)
          { path: 'resources/new', element: <ResourceForm /> },
          // 1.2 注册资源(编辑)
          { path: 'resources/edit/:id', element: <ResourceForm /> },
          // 兼容旧路径(V1.1.1 起草稿 Tab 收敛至 Resources 页)
          { path: 'drafts', element: <ResourceDrafts /> },
          // 2.1 申请管理
          { path: 'applies', element: <ApplyList /> },
          // 2.2 申请权限
          { path: 'apply-form', element: <ApplyForm /> },
          // 2.3 权限审批
          { path: 'approval/:id', element: <Approval /> },
          // 2.4 权限申请详情
          { path: 'applies/:id', element: <ApplyDetail /> },
        ],
      },
      // Evaluation (V1.6)
      {
        path: 'evaluation',
        children: [
          { index: true, element: <Evaluation /> },
          // 3.1 任务管理
          { path: 'tasks', element: <Tasks /> },
          // 3.2 新建评测任务
          { path: 'tasks/create', element: <CreateTask /> },
          // 3.3 评测结果详情
          { path: 'tasks/:id/report', element: <EvaluationReport /> },
          // 3.4 评测结果审核（仅管理员）
          { path: 'tasks/:id/review', element: <TaskReview /> },
          // 评测中进度页（保留 V1.5 用于演示）
          { path: 'tasks/:id/progress', element: <ProgressDetail /> },
          // 1.1 指标展示（只读 5 维表）
          { path: 'indicators', element: <Indicators /> },
          // 2.1 数据集管理
          { path: 'datasets', element: <Datasets /> },
          // 2.2 导入数据集
          { path: 'datasets/import', element: <ImportDataset /> },
          // 2.3 数据集详情
          { path: 'datasets/:datasetId', element: <EvaluationDatasetDetail /> },
          // 2.4 导入题集（向指定数据集追加题集）
          { path: 'datasets/:datasetId/import-questions', element: <ImportQuestions /> },
        ],
      },
      // Orchestration
      {
        path: 'orchestration',
        children: [
          { index: true, element: <Orchestration /> },
          { path: 'flows', element: <Flows /> },
          { path: 'flows/:id', element: <FlowEditor /> },
          { path: 'scenes', element: <Scenes /> },
        ],
      },
      // Monitoring（V1.8 重构：6 个一级入口 + 5/6 子页）
      {
        path: 'monitoring',
        children: [
          // 1. 监控告警总览（一级入口 = /app/monitoring）
          { index: true, element: <Overview /> },
          // 2. 业务监控
          { path: 'business', element: <BusinessV18 /> },
          // 3. 状态监控
          { path: 'status', element: <StatusV18 /> },
          // 4. 成本监控
          { path: 'cost', element: <CostV18 /> },
          // 5. 告警规则管理（仅管理员）
          { path: 'alert-rules', element: <MonitoringRuleManage /> },
          { path: 'alert-rules/create', element: <MonitoringRuleForm /> },
          { path: 'alert-rules/:id', element: <MonitoringRuleDetail /> },
          { path: 'alert-rules/:id/edit', element: <MonitoringRuleForm /> },
          // 6. 告警事件处置
          { path: 'alert-events', element: <AlertEventListV18 /> },
          { path: 'alert-events/assign', element: <AlertEventAssign /> },
          { path: 'alert-events/:id', element: <AlertEventDetail /> },
          { path: 'alert-events/:id/handle', element: <AlertEventHandle /> },
          { path: 'alert-events/:id/review', element: <AlertEventReview /> },
        ],
      },
      // Security
      {
        path: 'security',
        children: [
          { index: true, element: <Security /> },
          { path: 'events', element: <EventManage /> },
          { path: 'rules', element: <RuleManage /> },
          // 8-3 告警规则 独立下转页（V1.4：与监控中心 8-6 对齐）
          { path: 'rules/new', element: <SecurityAlertRuleForm /> },
          { path: 'rules/copy/:id', element: <SecurityAlertRuleForm /> },
          { path: 'rules/:id/edit', element: <SecurityAlertRuleForm /> },
        ],
      },
      // Data Asset (v1.3)
      {
        path: 'data-asset',
        children: [
          // 模块总览（指向「数据集资产列表」默认页）
          { index: true, element: <DatasetList /> },
          // 数据集资产列表入口
          { path: 'datasets', element: <DatasetList /> },
          { path: 'datasets/:id', element: <DatasetDetail /> },
          { path: 'datasets/:id/preview', element: <DatasetPreview /> },
          // 采集任务列表入口
          { path: 'collection-tasks', element: <CollectionTaskList /> },
          { path: 'collection-tasks/create', element: <CollectionTaskForm /> },
          { path: 'collection-tasks/:id/edit', element: <CollectionTaskForm /> },
          { path: 'collection-tasks/:id/logs', element: <CollectionLogList /> },
          // 兼容旧路径
          { path: 'overview', element: <DataAssetOverview /> },
        ],
      },
      // User Center
      {
        path: 'user-center',
        children: [
          { index: true, element: <UserCenter /> },
          { path: 'roles', element: <RoleManage /> },
          { path: 'function-permission', element: <FunctionPermission /> },
          { path: 'data-permission', element: <DataPermission /> },
        ],
      },
      // Notifications
      {
        path: 'notifications',
        children: [
          { index: true, element: <NotificationList /> },
        ],
      },
      // Audit
      {
        path: 'audit',
        children: [
          { index: true, element: <Audit /> },
        ],
      },
      // Data Dictionary（V1.0 需求说明书）
      {
        path: 'dict',
        children: [
          { index: true, element: <DictCategoryList /> },
          { path: 'items/:code', element: <DictItemList /> },
        ],
      },
      // Environment（V1.1 需求说明书：沙盒/正式两个独立页面，默认重定向到沙盒）
      {
        path: 'environment',
        children: [
          { index: true, element: <Navigate to="/app/environment/sandbox" replace /> },
          { path: 'sandbox', element: <SandboxPage /> },
          { path: 'production', element: <ProductionPage /> },
        ],
      },
    ],
  },
  // Catch all - redirect to home
  { path: '*', element: <Navigate to="/" replace /> },
];

const router = createBrowserRouter(routes);

export default router;
