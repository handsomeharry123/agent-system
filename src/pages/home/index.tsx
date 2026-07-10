/**
 * 医小管智能体 · 首页 V1.0（PRD V1 落地版）
 *
 * 改造范围:仅首页内容区。左侧 7 模块菜单由 BasicLayout(ProLayout)负责,保持原样不动。
 *
 * 首页内容区 = 「医小管智能体落地页」,V1.x 起改为三段式布局:
 *   第一层(全局 7 菜单)—— BasicLayout(ProLayout)
 *   第二层(本页内左侧管理栏,280px)—— HomeSidebarV2:工具/品牌/工作台/自动化任务记录/历史会话/账户
 *   第三层(本页内右侧对话区,flex:1)—— 2.1 问候区 / 2.2 推荐问句区 / 2.3 指令输入区
 *
 * 配套:点击推荐问句 / 手动输入 / 语音 / 附件 → 触发对话;
 *     关键词命中 5 大模块 → 给出 mock 回复(指向各模块页);
 *     未命中 → 兜底提示。
 *     第二层「历史会话」点击 → 重置 messages 载入该会话 mock 历史;
 *     第二层「新建任务」点击 → 重置 messages 注入问候语 + 聚焦输入框。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ApiOutlined,
  ArrowUpOutlined,
  AudioOutlined,
  DatabaseOutlined,
  FileAddOutlined,
  PaperClipOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Card,
  Col,
  Drawer,
  Dropdown,
  Empty,
  Input,
  message,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../hooks/useAuth';
import { useDemoSettings } from '../../hooks/useDemoSettings';
import AgentRobotIcon from '../agent-center/smart/AgentRobotIcon';
import HomeSidebarV2, {
  initialAutoTasks,
  initialSessions,
  runHistoryMocks,
  sessionHistoryMocks,
  type AutoTask,
  type SessionEntry,
} from './HomeSidebarV2';
import ConnectorList from './ConnectorList';
import AutoTaskList from './AutoTaskList';
import ModelSelector from './ModelSelector';

const { Text, Title } = Typography;
const { TextArea } = Input;

/* =========================================================
 * 场景标签:点击后将该场景的「说明」作为用户问句发送
 * ========================================================= */
type SceneTag = {
  key: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
};
const sceneTags: SceneTag[] = [
  {
    key: 'register-requirement',
    label: '登记需求',
    icon: <SafetyCertificateOutlined />,
    prompt: '请帮我登记一个智能体建设需求',
  },
  {
    key: 'access-apply',
    label: '接入申请',
    icon: <FileAddOutlined />,
    prompt: '帮我查看待审批的智能体接入申请',
  },
  {
    key: 'ledger-query',
    label: '台账查询',
    icon: <DatabaseOutlined />,
    prompt: '按科室统计全院已上线智能体的数量和分类',
  },
];

/* =========================================================
 * Mock 回复:根据问句关键词命中 5 大模块
 * ========================================================= */
const moduleReplyMap: { match: RegExp; module: string; reply: string; link?: { to: string; text: string } }[] = [
  {
    match: /审批|接入申请|待审批|接入/,
    module: '智能体接入中心',
    reply:
      '已为您定位到「智能体接入中心 / 注册管理」中 **3 条待审批** 申请：\n\n- 心电图智能辅助诊断系统（10 分钟前提交）\n- 影像分析系统 v2.1 注销申请（1 小时前提交）\n- 病历数据共享至科研平台申请（1.5 小时前提交）\n\n按提交时间倒序排列。',
    link: { to: '/app/agent-center', text: '前往智能体接入中心' },
  },
  {
    match: /建设需求|提报|需求/,
    module: '智能体建设需求管理',
    reply:
      '已为您汇总各科室本月提报的建设需求：\n\n- 心内科：智能心电判读助手（待评估）\n- 影像科：CT 多病种联合分析（已立项）\n- 急诊科：智能预问诊（已匹配 2 个候选）',
    link: { to: '/app/agent-needs', text: '前往需求管理' },
  },
  {
    match: /数量|分类|已上线|科室统计/,
    module: '统一台账中心',
    reply:
      '全院已上线智能体共 **48 个**，按科室分布 TOP3：\n\n- 影像科：12 个\n- 检验科：8 个\n- 心内科：6 个\n\n按功能分类：辅助诊断 18、影像分析 11、病历生成 7、用药审核 6、其他 6。',
    link: { to: '/app/ledger', text: '前往统一台账中心' },
  },
  {
    match: /评测|通过率|平均得分/,
    module: '统一准入评测沙盒',
    reply:
      '本月准入评测汇总：\n\n- 提交评测：**15** 个任务\n- 通过率：**73.3%**（11 通过 / 4 未通过）\n- 平均得分：**86.4** 分\n\n未通过任务 TOP2：智能导诊 v3.0（58 分）、电子病历生成 v2.5（62 分）。',
    link: { to: '/app/evaluation/tasks', text: '前往评测任务管理' },
  },
  {
    match: /失败|调用失败|24 ?小时/,
    module: '统一运行监控中心',
    reply:
      '最近 24h 失败调用 TOP3：\n\n1. 智能导诊系统：**142 次**失败（错误码 502，多为上游 HIS 抖动）\n2. 处方审核系统：**58 次**失败（超时 P99 偏高）\n3. 影像分析平台：**23 次**失败（存储上传失败）\n\n建议先排查智能导诊系统连通性。',
    link: { to: '/app/monitoring/business', text: '前往业务监控' },
  },
  {
    match: /告警|高优先级/,
    module: '统一运行监控中心 / 告警事件',
    reply:
      '当前未处理告警 **17 条**，按严重程度排序：\n\n- P0（紧急）：2 条\n  - 智能导诊系统 连续 5 分钟失败率 > 30%\n  - 处方审核系统 响应超时\n- P1（高）：6 条\n- P2（中）：9 条',
    link: { to: '/app/monitoring/alert-events', text: '前往告警事件处置' },
  },
  {
    match: /报告|运行管理|运行情况/,
    module: '统一台账中心 / 报告',
    reply:
      '已为您生成「**本月智能体运行管理情况报告**」草稿，包含：\n\n- 总体运行概况（调用量 / 成功率 / 在线率）\n- 各科室智能体覆盖度\n- 准入评测结果统计\n- 告警与异常事件汇总\n- 改进建议与下月计划',
    link: { to: '/app/ledger-demo/report', text: '打开报告草稿' },
  },
  {
    match: /本科室|我们科室/,
    module: '本科室视角',
    reply:
      '本科室当前可用智能体：\n\n- 智能导诊系统（日均 256 次调用）\n- 处方审核系统（日均 142 次调用）\n- 病历智能生成系统（日均 89 次调用）\n\n本月调用成功率 **98.6%**，无未处理告警。',
    link: { to: '/app/ledger/list', text: '查看本科室台账' },
  },
  {
    match: /资源|权限|申请/,
    module: '医院资源管理中心',
    reply:
      '您可以前往「医院资源管理中心」进行：\n\n- 资源注册（信息科管理员）\n- 权限申请 / 审批（按需）\n- 资源管理（资源注册与编辑）',
    link: { to: '/app/resource-center/applies', text: '前往资源中心' },
  },
];

const fallbackReply =
  '暂未理解您的诉求，请尝试换种表述或从下方推荐问句中选择。\n\n您也可以告诉我您想触达的目标，例如：\n- **审批/申请** → 智能体接入中心\n- **查询/统计** → 统一台账中心\n- **资源管理** → 医院资源管理中心\n- **准入评测** → 统一准入评测沙盒\n- **告警/报告** → 统一运行监控中心';

const pickReply = (text: string): { module: string; reply: string; link?: { to: string; text: string } } => {
  for (const m of moduleReplyMap) {
    if (m.match.test(text)) return m;
  }
  return { module: '医小管', reply: fallbackReply };
};

type RequirementStep =
  | 'n0'
  | 'confirmDept'
  | 'functionDetails'
  | 'confirmFunction'
  | 'reason'
  | 'confirmReason'
  | 'clinicStage'
  | 'resources'
  | 'urgency'
  | 'contact'
  | 'contactFix'
  | 'summary'
  | 'done';

type RequirementSlots = {
  rawNeed?: string;
  department?: string;
  functionDescription?: string;
  reason?: string;
  clinicStage?: string;
  resources?: string;
  urgency?: string;
  proposer?: string;
  phone?: string;
  sidetrack?: string[];
};

type RequirementFlow = {
  sessionId: string;
  step: RequirementStep;
  slots: RequirementSlots;
};

type LedgerFlow = {
  sessionId: string;
};

type AccessStep =
  | 'collectMaterial'
  | 'agentName'
  | 'agentNameRetry'
  | 'department'
  | 'clinicStage'
  | 'confirmFunction'
  | 'connectivityFix'
  | 'materialConfirm'
  | 'summary'
  | 'done';

type AccessSlots = {
  agentName?: string;
  version?: string;
  department?: string;
  departmentCode?: string;
  clinicStage?: string;
  functionDescription?: string;
  source?: string;
  vendor?: string;
  contact?: string;
  phone?: string;
  accessMethod?: string;
  endpoint?: string;
  apiKeyMasked?: string;
  connectivity?: string;
  materials?: string[];
};

type AccessFlow = {
  sessionId: string;
  step: AccessStep;
  slots: AccessSlots;
};

const ledgerRecommendedQuestions = [
  '帮我生成一份今日的全院智能体管理情况报告',
  '我想要查看糖尿病随访管理助手的 360 画像',
  '目前智能体的告警情况',
];

/* =========================================================
 * 主页组件
 * ========================================================= */
const HomePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { demoRole } = useDemoSettings();

  const role: '信息科管理员' | '科室管理员' = demoRole === '信息科管理员' ? '信息科管理员' : '科室管理员';
  const isItAdmin = role === '信息科管理员';

  // 消息列表
  type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    module?: string;
    link?: { to: string; text: string };
    quickActions?: string[];
    time: string;
  };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [model, setModel] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [extraSessions, setExtraSessions] = useState<SessionEntry[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionConversations, setSessionConversations] = useState<Record<string, ChatMessage[]>>({});
  const [requirementFlow, setRequirementFlow] = useState<RequirementFlow | null>(null);
  const [ledgerFlow, setLedgerFlow] = useState<LedgerFlow | null>(null);
  const [accessFlow, setAccessFlow] = useState<AccessFlow | null>(null);
  /** 是否处于「新建任务」视图;切换到历史会话 / 自动化执行记录后置 false,场景标签随之隐藏 */
  const [isNewTaskView, setIsNewTaskView] = useState(true);

  /* 底栏「+」下拉:连接器 Drawer */
  const [connectorOpen, setConnectorOpen] = useState(false);
  const [connectorMap, setConnectorMap] = useState<Record<string, boolean>>({
    wechat: false,
    feishu: false,
    email: false,
    sms: false,
  });
  /* 首页中间内容区 slot:'overview' 显示医小管对话;'connector' 显示连接器列表;'auto-tasks' 显示自动化任务列表 */
  const requestedMiddleView = (
    location.state as {
      middleView?: 'overview' | 'connector' | 'auto-tasks';
    } | null
  )?.middleView;
  const routeMiddleView: 'connector' | 'auto-tasks' | undefined =
    location.pathname.endsWith('/connector')
      ? 'connector'
      : location.pathname.endsWith('/auto-tasks')
        ? 'auto-tasks'
        : undefined;
  const [middleView, setMiddleView] = useState<'overview' | 'connector' | 'auto-tasks'>(
    requestedMiddleView ?? routeMiddleView ?? 'overview',
  );
  const [autoTasks, setAutoTasks] = useState<AutoTask[]>(() =>
    initialAutoTasks.map((task) => ({
      ...task,
      runs: task.runs.map((run) => ({ ...run })),
    })),
  );
  const messageListRef = useRef<HTMLDivElement>(null);

  // 角色变化/首次进入 → 注入问候语
  useEffect(() => {
    setMessages([
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: buildGreeting(role, currentUser?.name),
        time: nowStr(),
      },
    ]);
    setActiveSessionId(null);
    setRequirementFlow(null);
    setLedgerFlow(null);
    setAccessFlow(null);
    setIsNewTaskView(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    if (!activeSessionId) return;
    setSessionConversations((prev) => ({ ...prev, [activeSessionId]: messages }));
  }, [activeSessionId, messages]);

  /* 连接器详情「去试试」→ 在这里把提示词注入输入框,写完即清 state */
  const activeConnector = (location.state as { activeConnector?: string } | null)?.activeConnector;
  useEffect(() => {
    if (!activeConnector) return;
    const labels: Record<string, string> = {
      wechat: '微信',
      wecom: '企业微信',
      qq: 'QQ',
      feishu: '飞书',
      dingtalk: '钉钉',
      qqmail: 'QQ 邮箱',
      corpemail: '企业邮箱',
      smsgw: '短信网关',
    };
    const label = labels[activeConnector] ?? activeConnector;
    setDraft(`用${label}给我发一条示例消息`);
    // 清掉 state 避免下一次渲染重复注入
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConnector]);

  /* 自动化任务「新建」页提交成功 → 在这里把「任务创建成功」气泡推入对话区 */
  const autoTaskCreated = (location.state as { autoTaskCreated?: { id: string; name: string; firstRunName: string } } | null)?.autoTaskCreated;
  useEffect(() => {
    if (!autoTaskCreated) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content:
          `已为您创建自动化任务 **${autoTaskCreated.name}**,并生成首次执行子任务 **${autoTaskCreated.firstRunName}**。\n\n` +
          `任务详情可在左侧「自动化任务记录」展开查看;执行结果将按设定频率自动推送。`,
        module: '自动化任务',
        link: { to: '/app/home/overview', text: '查看执行记录' },
        time: nowStr(),
      },
    ]);
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTaskCreated?.id]);

  /* ---------- 事件:第二层 HomeSidebarV2 回调 ---------- */
  /*
   * 工作台入口是“选择视图”而不是开关。
   * 这里若使用 prev 取反，Sidebar 已经把入口保持为 active，但中间区会在重复点击时
   * 被切回 overview，造成“左侧已选中、右侧还是旧内容”的双状态不同步。
   */
  const handleOpenConnector = useCallback(() => {
    setMiddleView('connector');
    setActiveSessionId(null);
    setRequirementFlow(null);
    setLedgerFlow(null);
    setAccessFlow(null);
  }, []);

  /* 与连接器一致，重复点击仍保持自动化任务列表。 */
  const handleOpenAutoTasks = useCallback(() => {
    setMiddleView('auto-tasks');
    setActiveSessionId(null);
    setRequirementFlow(null);
    setLedgerFlow(null);
    setAccessFlow(null);
  }, []);

  const handleBackToChat = useCallback(() => {
    setMiddleView('overview');
  }, []);

  const handleNewTask = useCallback(() => {
    /* 任何视图下点「新建任务」→ 先切回医小管对话区,再注入问候语 + 聚焦输入框 */
    setMiddleView('overview');
    setActiveSessionId(null);
    setRequirementFlow(null);
    setLedgerFlow(null);
    setAccessFlow(null);
    setMessages([
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: buildGreeting(role, currentUser?.name),
        time: nowStr(),
      },
    ]);
    setDraft('');
    setIsNewTaskView(true);
    window.setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>(
        '[data-testid="home-v1-input"] textarea',
      );
      el?.focus();
    }, 60);
  }, [role, currentUser?.name]);

  const handleRestoreSession = useCallback((id: string) => {
    const hist = sessionConversations[id] ?? sessionHistoryMocks[id];
    if (!hist) {
      message.info('该会话暂无历史记录');
      return;
    }
    setMiddleView('overview');
    setMessages(hist);
    setDraft('');
    setActiveSessionId(id);
    if (id.startsWith('req-')) {
      setRequirementFlow((prev) => (prev?.sessionId === id ? prev : null));
      setLedgerFlow(null);
      setAccessFlow(null);
    } else if (id.startsWith('ledger-')) {
      setLedgerFlow({ sessionId: id });
      setRequirementFlow(null);
      setAccessFlow(null);
    } else if (id.startsWith('access-')) {
      setAccessFlow((prev) => (prev?.sessionId === id ? prev : { sessionId: id, step: 'collectMaterial', slots: {} }));
      setRequirementFlow(null);
      setLedgerFlow(null);
    } else {
      setRequirementFlow(null);
      setLedgerFlow(null);
      setAccessFlow(null);
    }
    setIsNewTaskView(false);
    window.setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>(
        '[data-testid="home-v1-input"] textarea',
      );
      el?.focus();
    }, 60);
  }, [sessionConversations]);

  const handleRestoreRun = useCallback((id: string) => {
    const hist = runHistoryMocks[id];
    if (!hist) {
      message.info('该执行记录暂无对话数据');
      return;
    }
    setMiddleView('overview');
    setMessages(hist);
    setDraft('');
    setActiveSessionId(null);
    setRequirementFlow(null);
    setLedgerFlow(null);
    setAccessFlow(null);
    setIsNewTaskView(false);
  }, []);

  const startRequirementRegistration = useCallback(() => {
    const sessionId = `req-${Date.now()}`;
    const newSession: SessionEntry = {
      id: sessionId,
      title: '智能体建设需求登记',
      updatedAt: '刚刚',
    };
    const opening: ChatMessage = {
      id: `req-a-${Date.now()}`,
      role: 'assistant',
      content: buildRequirementOpening(),
      module: '需求登记',
      time: nowStr(),
    };

    setMiddleView('overview');
    setExtraSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(sessionId);
    setRequirementFlow({ sessionId, step: 'n0', slots: {} });
    setLedgerFlow(null);
    setAccessFlow(null);
    setMessages([opening]);
    setDraft('');
    setIsNewTaskView(false);
    window.setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>(
        '[data-testid="home-v1-input"] textarea',
      );
      el?.focus();
    }, 60);
  }, []);

  const startLedgerQuery = useCallback(() => {
    const sessionId = `ledger-${Date.now()}`;
    const newSession: SessionEntry = {
      id: sessionId,
      title: '台账查询',
      updatedAt: '刚刚',
    };
    const opening: ChatMessage = {
      id: `ledger-a-${Date.now()}`,
      role: 'assistant',
      content: buildLedgerOpening(),
      module: '台账查询',
      quickActions: ledgerRecommendedQuestions,
      time: nowStr(),
    };

    setMiddleView('overview');
    setExtraSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(sessionId);
    setRequirementFlow(null);
    setLedgerFlow({ sessionId });
    setAccessFlow(null);
    setMessages([opening]);
    setDraft('');
    setIsNewTaskView(false);
    window.setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>(
        '[data-testid="home-v1-input"] textarea',
      );
      el?.focus();
    }, 60);
  }, []);

  const startAccessApplication = useCallback(() => {
    const sessionId = `access-${Date.now()}`;
    const newSession: SessionEntry = {
      id: sessionId,
      title: '接入申请',
      updatedAt: '刚刚',
    };
    const opening: ChatMessage = {
      id: `access-a-${Date.now()}`,
      role: 'assistant',
      content: buildAccessOpening(),
      module: '接入申请',
      quickActions: ['上传技术规格书.docx，并口述产品说明', '文字描述糖尿病随访助手', '我先口述材料内容'],
      time: nowStr(),
    };

    setMiddleView('overview');
    setExtraSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(sessionId);
    setRequirementFlow(null);
    setLedgerFlow(null);
    setAccessFlow({ sessionId, step: 'collectMaterial', slots: {} });
    setMessages([opening]);
    setDraft('');
    setIsNewTaskView(false);
    window.setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>(
        '[data-testid="home-v1-input"] textarea',
      );
      el?.focus();
    }, 60);
  }, []);

  /* 1.5 自动化任务新建成功 → 右侧对话区推一条「任务创建成功」气泡 + 链接到 1.5 分组 */
  const handleAutoTaskCreated = useCallback(
    (task: AutoTask, firstRunName: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content:
            `已为您创建自动化任务 **${task.name}**,并生成首次执行子任务 **${firstRunName}**。\n\n` +
            `任务详情可在左侧「自动化任务记录」展开查看;执行结果将按设定频率自动推送。`,
          module: '自动化任务',
          link: { to: '/app/home/overview', text: '查看执行记录' },
          time: nowStr(),
        },
      ]);
    },
    [],
  );

  // 新消息自动滚动到底
  useEffect(() => {
    const el = messageListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  /* ---------- 事件:发送 / 停止 ---------- */
  const handleSend = (overrideText?: string) => {
    const text = (overrideText ?? draft).trim();
    if (!text || loading) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      time: nowStr(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    setLoading(true);
    window.setTimeout(() => {
      if (
        requirementFlow &&
        requirementFlow.sessionId === activeSessionId &&
        requirementFlow.step !== 'done'
      ) {
        const next = getRequirementNext(requirementFlow, text);
        setMessages((prev) => [
          ...prev,
          ...next.replies.map((content, index) => ({
            id: `req-a-${Date.now()}-${index}`,
            role: 'assistant' as const,
            content,
            module: '需求登记',
            link: index === next.replies.length - 1 ? next.link : undefined,
            time: nowStr(),
          })),
        ]);
        setRequirementFlow(next.flow);
        setExtraSessions((prev) =>
          prev.map((s) => (s.id === next.flow.sessionId ? { ...s, updatedAt: '刚刚' } : s)),
        );
        setLoading(false);
        return;
      }
      if (ledgerFlow && ledgerFlow.sessionId === activeSessionId) {
        const next = getLedgerReply(text, role);
        setMessages((prev) => [
          ...prev,
          {
            id: `ledger-a-${Date.now()}`,
            role: 'assistant' as const,
            content: next.reply,
            module: next.module,
            link: next.link,
            quickActions: next.quickActions,
            time: nowStr(),
          },
        ]);
        setExtraSessions((prev) =>
          prev.map((s) => (s.id === ledgerFlow.sessionId ? { ...s, updatedAt: '刚刚' } : s)),
        );
        setLoading(false);
        return;
      }
      if (accessFlow && accessFlow.sessionId === activeSessionId && accessFlow.step !== 'done') {
        const next = getAccessNext(accessFlow, text);
        setMessages((prev) => [
          ...prev,
          ...next.replies.map((content, index) => ({
            id: `access-a-${Date.now()}-${index}`,
            role: 'assistant' as const,
            content,
            module: '接入申请',
            link: index === next.replies.length - 1 ? next.link : undefined,
            quickActions: index === next.replies.length - 1 ? next.quickActions : undefined,
            time: nowStr(),
          })),
        ]);
        setAccessFlow(next.flow);
        setExtraSessions((prev) =>
          prev.map((s) => (s.id === next.flow.sessionId ? { ...s, updatedAt: '刚刚' } : s)),
        );
        setLoading(false);
        return;
      }
      const r = pickReply(text);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: r.reply,
          module: r.module,
          link: r.link,
          time: nowStr(),
        },
      ]);
      setLoading(false);
    }, 1200);
  };

  const handleStop = () => setLoading(false);

  /* ---------- 数据 ---------- */
  // 场景标签:点击后将该场景的 prompt 作为问句发送
  const handleSceneTagClick = (tag: SceneTag) => {
    if (tag.key === 'register-requirement') {
      startRequirementRegistration();
      return;
    }
    if (tag.key === 'ledger-query') {
      startLedgerQuery();
      return;
    }
    if (tag.key === 'access-apply') {
      startAccessApplication();
      return;
    }
    handleSend(tag.prompt);
  };

  /* =========================================================
   * 渲染
   * ========================================================= */
  return (
    <div
      data-testid="home-v1"
      style={{
        padding: 16,
        background: '#F0F2F5',
        height: 'calc(100dvh - 64px)',
        minHeight: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Row gutter={16} style={{ flex: 1, minHeight: 0 }}>
        {/* === 第二层:首页内左侧管理栏(280px,窄屏 <1280 隐藏) === */}
        <Col
          xs={0}
          sm={0}
          md={6}
          lg={6}
          xl={6}
          xxl={6}
          style={{ height: '100%' }}
          data-testid="home-v1-side-col"
        >
          <HomeSidebarV2
            initialActiveKey={
              middleView === 'connector'
                ? 'connector'
                : middleView === 'auto-tasks'
                  ? 'auto-task'
                  : 'new'
            }
            onNewTask={handleNewTask}
            onRestoreSession={handleRestoreSession}
            onRestoreRun={handleRestoreRun}
            onAutoTaskCreated={handleAutoTaskCreated}
            onOpenConnector={handleOpenConnector}
            onOpenAutoTasks={handleOpenAutoTasks}
            autoTasks={autoTasks}
            sessions={[...extraSessions, ...initialSessions]}
            activeSessionId={activeSessionId}
          />
        </Col>

        {/* === 第三层:首页内右侧对话区(占剩余 18/24) === */}
        <Col span={18} style={{ height: '100%', minWidth: 0 }}>
          {/* 窄屏补偿:1.3 三入口下沉到顶部(<1280 显示) */}
          <div className="home-v1-narrow-actions">
            <Space size={4} wrap>
              <Button size="small" onClick={handleNewTask} data-testid="home-v1-narrow-new">
                新建任务
              </Button>
              <Button
                size="small"
                onClick={() => message.info('连接器:请在宽屏(≥1280)下使用第二层入口', 2)}
                data-testid="home-v1-narrow-connector"
              >
                连接器
              </Button>
              <Button
                size="small"
                onClick={() => message.info('自动化任务:请在宽屏(≥1280)下使用第二层入口', 2)}
                data-testid="home-v1-narrow-auto"
              >
                自动化任务
              </Button>
            </Space>
          </div>
          <style>{`
            .home-v1-narrow-actions { display: none; margin-bottom: 8px; }
            @media (max-width: 1279px) {
              .home-v1-narrow-actions { display: block; }
            }
          `}</style>

          <Card
            bordered={false}
            styles={{
              body: {
                padding: 0,
                background: '#FFFFFF',
                borderRadius: 8,
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              },
            }}
            style={{ height: '100%' }}
          >
        {middleView === 'connector' ? (
          <div style={{ height: '100%', overflow: 'auto' }} data-testid="home-v1-middle-connector">
            {/* 内嵌连接器列表（隐藏副标题 + 演示态 Segmented）。 */}
            <ConnectorList embedded />
          </div>
        ) : middleView === 'auto-tasks' ? (
          <div style={{ height: '100%', overflow: 'auto' }} data-testid="home-v1-middle-auto-tasks">
            {/* 内嵌自动化任务列表（隐藏返回按钮）。 */}
            <AutoTaskList embedded tasks={autoTasks} onTasksChange={setAutoTasks} />
          </div>
        ) : (
          <>
        {/* 2.1 问候区 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 24px',
            background: 'linear-gradient(135deg, #E6F4FF 0%, #F0F5FF 100%)',
            borderBottom: '1px solid #F0F0F0',
          }}
        >
          <AgentRobotIcon mood={loading ? 'thinking' : 'happy'} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Title level={4} style={{ margin: 0, color: '#1677FF', fontSize: 18 }}>
              医小管
            </Title>
            <Text style={{ fontSize: 12, color: '#555', display: 'block', marginTop: 2 }}>
              接入 · 台账 · 资源 · 评测 · 监控，一句话就能办
            </Text>
            <Text style={{ fontSize: 13, color: '#333', display: 'block', marginTop: 4 }}>
              您好,{currentUser?.name ?? '用户'},我是医小管,请问有什么能帮到您?
            </Text>
          </div>
        </div>

        {/* 2.2 场景标签 + 2.x 消息流(滚动) */}
        <div
          ref={messageListRef}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '16px 24px',
            background: '#FAFAFA',
          }}
        >
          {messages.length === 0 ? (
            <Empty description="暂无对话" style={{ marginTop: 80 }} />
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                msg={m}
                navigate={navigate}
                onQuickAction={handleSend}
              />
            ))
          )}
          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10 }}>
              <AgentRobotIcon mood="thinking" size={28} />
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  padding: '8px 12px',
                  color: '#999',
                  fontSize: 12,
                }}
              >
                医小管正在思考…
              </div>
            </div>
          )}
        </div>

        {/* 2.3 指令输入区 */}
        <div
          style={{
            padding: '10px 24px 14px',
            borderTop: '1px solid #F0F0F0',
            background: '#FFFFFF',
          }}
        >
          {/* 场景标签:仅在「新建任务」视图下展示,且紧贴输入框上方(图2 布局) */}
          {isNewTaskView && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 6,
              }}
            >
              {sceneTags.map((t) => (
                <div
                  key={t.key}
                  onClick={() => handleSceneTagClick(t)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#FFFFFF',
                    border: '1px solid #D9D9D9',
                    borderRadius: 999,
                    padding: '4px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#262626',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1677FF';
                    e.currentTarget.style.color = '#1677FF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#D9D9D9';
                    e.currentTarget.style.color = '#262626';
                  }}
                  data-testid={`home-v1-scene-${t.key}`}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12 }}>{t.icon}</span>
                  <span>{t.label}</span>
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              border: '1px solid #D9D9D9',
              borderRadius: 10,
              padding: '6px 10px',
              background: '#FFFFFF',
            }}
          >
            <TextArea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="向医小管提问:例如「本月准入评测通过率是多少」…"
              autoSize={{ minRows: 2, maxRows: 5 }}
              variant="borderless"
              data-testid="home-v1-input"
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 4,
                flexWrap: 'wrap',
              }}
            >
              {/* 左侧:「+」下拉(添加文件 / 连接器) */}
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'file',
                      label: '添加文件',
                      icon: <PaperClipOutlined />,
                    },
                    {
                      key: 'connector',
                      label: '连接器',
                      icon: <ApiOutlined />,
                    },
                  ],
                  onClick: ({ key }) => {
                    if (key === 'file') {
                      message.info('附件上传:v1.1 开放', 2);
                    } else if (key === 'connector') {
                      setConnectorOpen(true);
                    }
                  },
                }}
                trigger={['click']}
                placement="topLeft"
              >
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  data-testid="home-v1-toolbar-add"
                />
              </Dropdown>
              <span style={{ flex: 1 }} />
              {/* 右侧:模型 + 语音 + 发送 */}
              <Space size={4}>
                <ModelSelector
                  size="small"
                  variant="borderless"
                  compact
                  value={model}
                  onChange={setModel}
                  style={{ width: 104, fontSize: 12 }}
                  testId="home-model-selector"
                />
                <Tooltip title="语音输入">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<AudioOutlined style={{ fontSize: 17 }} />}
                    style={{ width: 32, height: 32, color: '#262626' }}
                    data-testid="home-v1-toolbar-voice"
                  />
                </Tooltip>
                {loading ? (
                  <Button
                    type="text"
                    shape="circle"
                    icon={<StopOutlined style={{ fontSize: 15 }} />}
                    onClick={handleStop}
                    style={{
                      width: 34,
                      height: 34,
                      color: '#FFFFFF',
                      background: '#FF4D4F',
                    }}
                    data-testid="home-v1-stop"
                  />
                ) : (
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<ArrowUpOutlined style={{ fontSize: 16, fontWeight: 600 }} />}
                    onClick={() => handleSend()}
                    disabled={!draft.trim()}
                    aria-label="发送消息"
                    style={{
                      width: 34,
                      height: 34,
                      border: 0,
                      boxShadow: 'none',
                      background: draft.trim() ? '#1677FF' : '#D9D9D9',
                      color: '#FFFFFF',
                    }}
                    data-testid="home-v1-send"
                  />
                )}
              </Space>
            </div>
          </div>
          <div style={{ marginTop: 4, fontSize: 10, color: '#999' }}>
            Enter 发送 · Shift + Enter 换行 · 输出形式:文本/列表/跳转/报告(Word/PDF)/消息推送
          </div>
        </div>
          </>
        )}
      </Card>
        </Col>
      </Row>

      {/* ============ Drawer:连接器(由底栏「+ → 连接器」打开) ============ */}
      <Drawer
        title="连接器管理"
        placement="right"
        width={360}
        open={connectorOpen}
        onClose={() => setConnectorOpen(false)}
        destroyOnHidden
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={() => setConnectorOpen(false)}>取消</Button>
            <Button type="primary" onClick={() => setConnectorOpen(false)}>
              保存
            </Button>
          </Space>
        }
      >
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          开启后可将医小管消息推送至外部系统。
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'wechat', name: '微信', desc: '企业微信群机器人' },
            { key: 'feishu', name: '飞书', desc: '飞书机器人 Webhook' },
            { key: 'email', name: '邮箱', desc: 'SMTP 邮件推送' },
            { key: 'sms', name: '短信', desc: '短信网关推送' },
          ].map((c) => (
            <div
              key={c.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#FAFAFA',
                borderRadius: 6,
              }}
            >
              <div>
                <Text strong style={{ fontSize: 13 }}>
                  {c.name}
                </Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                  {c.desc}
                </Text>
              </div>
              <Switch
                checked={connectorMap[c.key]}
                onChange={(v) => setConnectorMap((prev) => ({ ...prev, [c.key]: v }))}
                size="small"
              />
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
};

/* =========================================================
 * 子组件:消息气泡
 * ========================================================= */
const MessageBubble = ({
  msg,
  navigate,
  onQuickAction,
}: {
  msg: any;
  navigate: (to: string) => void;
  onQuickAction?: (text: string) => void;
}) => {
  const isUser = msg.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 8,
        alignItems: 'flex-start',
        marginBottom: 12,
      }}
    >
      {isUser ? (
        <Avatar size={28} style={{ background: '#1677FF', flexShrink: 0 }} icon={<UserOutlined />} />
      ) : (
        <AgentRobotIcon mood="happy" size={28} />
      )}
      <div style={{ maxWidth: '78%' }}>
        {!isUser && msg.module && (
          <div style={{ marginBottom: 4 }}>
            <Tag color="blue" style={{ fontSize: 11 }}>
              {msg.module}
            </Tag>
          </div>
        )}
        <div
          style={{
            background: isUser ? '#1677FF' : '#FFFFFF',
            color: isUser ? '#fff' : '#333',
            border: isUser ? 'none' : '1px solid #E5E7EB',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            lineHeight: 1.6,
            wordBreak: 'break-word',
          }}
        >
          <ReactMarkdown
            components={{
              p: ({ children }) => <span style={{ display: 'block', marginBottom: 4 }}>{children}</span>,
              ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '4px 0' }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: '4px 0' }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
              code: ({ children }) => (
                <code
                  style={{
                    background: isUser ? 'rgba(255,255,255,0.2)' : '#F5F5F5',
                    padding: '0 4px',
                    borderRadius: 3,
                    fontSize: 12,
                  }}
                >
                  {children}
                </code>
              ),
              strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
            }}
          >
            {msg.content}
          </ReactMarkdown>
          {msg.link && (
            <div style={{ marginTop: 8 }}>
              <Button
                type="link"
                size="small"
                style={{ padding: 0, color: isUser ? '#fff' : '#1677FF' }}
                onClick={() => navigate(msg.link!.to)}
                data-testid="home-v1-link"
              >
                {msg.link.text} →
              </Button>
            </div>
          )}
          {!isUser && Array.isArray(msg.quickActions) && msg.quickActions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {msg.quickActions.map((action: string) => (
                <Button
                  key={action}
                  size="small"
                  style={{ borderRadius: 999, fontSize: 11, height: 26 }}
                  onClick={() => onQuickAction?.(action)}
                  data-testid="home-v1-ledger-quick-action"
                >
                  {action}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#999',
            marginTop: 4,
            textAlign: isUser ? 'right' : 'left',
          }}
        >
          {msg.time}
        </div>
      </div>
    </div>
  );
};


/* =========================================================
 * 工具
 * ========================================================= */
function nowStr() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function buildGreeting(role: '信息科管理员' | '科室管理员', userName?: string): string {
  const who = userName ?? '用户';
  return role === '信息科管理员'
    ? `您好,${who},我是医小管,请问有什么能帮到您?\n\n我可以帮您一站式处理:\n- **智能体接入** 审批/申请\n- **统一台账** 查询/统计\n- **运行监控** 告警/报告`
    : `您好,${who},我是医小管,请问有什么能帮到您?\n\n我可以帮您快速:\n- 查找本科室可用的智能体\n- 提报建设需求 / 跟踪接入审批\n- 了解本科室本月调用与告警情况`;
}

function buildRequirementOpening(): string {
  return '你好！我是医小管，我来帮您登记智能体建设需求（约 8 步、3–5 分钟，内容随时可改）。\n\n请用一两句话描述：您想建设一个什么样的智能体、主要解决什么问题？';
}

function buildLedgerOpening(): string {
  return `你好，我是医小管。台账相关问题都可以问我。

你可以直接问全院/本科室智能体家底、运行指标、告警情况，也可以查看某个智能体的 360 画像。`;
}

function buildAccessOpening(): string {
  return '你好！我是医小管。把产品说明书 / 技术规格书发给我（支持 PDF、DOC、DOCX、XLSX、csv、jpg、jpeg、png、链接等任意文件格式），或文字、语音描述，我来帮你进行智能体接入信息注册申请～';
}

function buildAccessFunctionDescription(): string {
  return '面向出院及门诊糖尿病患者提供随访服务，读取患者基础信息、诊疗记录、检验指标与随访计划，自动生成随访任务、健康提醒与异常风险提示，并向责任医生输出结构化随访报告与风险提醒。';
}

function getAccessNext(
  flow: AccessFlow,
  text: string,
): {
  flow: AccessFlow;
  replies: string[];
  link?: { to: string; text: string };
  quickActions?: string[];
} {
  const normalized = text.trim();
  const slots: AccessSlots = { ...flow.slots };
  const yes = /确认|可以|没问题|就用|提交|无误|通过|好/.test(normalized);

  if (/排班|台账|告警|报告|先查|天气|新闻/.test(normalized) && flow.step !== 'summary') {
    return {
      flow,
      replies: ['我们先来完成智能体接入注册申请，稍后再为您解决此问题。\n\n当前请继续提供或确认接入注册所需信息。'],
    };
  }

  switch (flow.step) {
    case 'collectMaterial': {
      slots.version = /1\.0|1\.1|2\.0|2\.1|v2\.1/i.test(normalized) ? '2.1' : '2.1';
      slots.source = /合作|第三方/.test(normalized) ? '合作研发' : '合作研发';
      slots.vendor = /健康|科技|公司/.test(normalized) ? '智医健康科技有限公司' : '智医健康科技有限公司';
      slots.contact = /陈明/.test(normalized) ? '陈明' : '陈明';
      slots.phone = normalized.match(/\d{11}/)?.[0] ?? '13812345678';
      slots.accessMethod = /SDK/i.test(normalized) ? 'SDK' : /OTel/i.test(normalized) ? 'OTel' : 'API';
      slots.endpoint = 'https://api.xxhealth.com/dm-followup/v2';
      slots.apiKeyMasked = '********';
      slots.functionDescription = buildAccessFunctionDescription();
      slots.materials = ['技术规格书.docx（已解析，需转 PDF 留存）'];
      return {
        flow: { ...flow, step: 'agentName', slots },
        replies: [
          `收到，正在识别……

我已自动填充：

- 智能体版本：${slots.version}
- 功能描述：${slots.functionDescription}
- 来源：${slots.source}
- 供应商：${slots.vendor}
- 技术联系人：${slots.contact}
- 联系方式：${slots.phone}
- 接入方式：${slots.accessMethod}
- 接口地址：${slots.endpoint}
- API key：${slots.apiKeyMasked}（已密文保存）

仍缺失：智能体名称、所属科室、诊疗环节；另外产品说明书尚未提供，我后面可依据已填字段自动生成 PDF。

先确认智能体名称——请问它叫什么？（2–20 个字符）`,
        ],
        quickActions: ['糖尿病随访助手', '内分泌糖尿病随访管理助手'],
      };
    }
    case 'agentName': {
      const name = normalized.replace(/[。.!！]/g, '');
      if (/糖尿病随访助手$/.test(name) || name === '糖尿病随访助手') {
        return {
          flow: { ...flow, step: 'agentNameRetry', slots },
          replies: ['“糖尿病随访助手”查重发现此名称已被使用，请重新命名。'],
          quickActions: ['内分泌糖尿病随访管理助手'],
        };
      }
      slots.agentName = name.slice(0, 20) || '内分泌糖尿病随访管理助手';
      return {
        flow: { ...flow, step: 'department', slots },
        replies: [`“${slots.agentName}”（${slots.agentName.length}/20）可用，已记录。\n\n所属科室请选择或报出：【0503 内分泌科】【0504 内分泌代谢科】。`],
        quickActions: ['0503 内分泌科', '0504 内分泌代谢科'],
      };
    }
    case 'agentNameRetry': {
      slots.agentName = normalized.replace(/[。.!！]/g, '').slice(0, 20) || '内分泌糖尿病随访管理助手';
      return {
        flow: { ...flow, step: 'department', slots },
        replies: [`“${slots.agentName}”（${slots.agentName.length}/20）可用，已记录。\n\n所属科室请选择或报出：【0503 内分泌科】【0504 内分泌代谢科】。`],
        quickActions: ['0503 内分泌科', '0504 内分泌代谢科'],
      };
    }
    case 'department': {
      slots.departmentCode = /0504/.test(normalized) ? '0504' : '0503';
      slots.department = slots.departmentCode === '0504' ? '内分泌代谢科' : '内分泌科';
      return {
        flow: { ...flow, step: 'clinicStage', slots },
        replies: ['诊疗环节请选：【导诊分诊】【预问诊】【预约挂号】【辅助检查】【辅助诊断】【辅助治疗】【住院】【手术】【其他】（可点、可说、可打字）。'],
        quickActions: ['其他：出院后随访管理', '辅助治疗', '辅助诊断'],
      };
    }
    case 'clinicStage': {
      slots.clinicStage = /其他|随访/.test(normalized) ? '其他（出院后随访管理）' : normalized.slice(0, 20);
      return {
        flow: { ...flow, step: 'confirmFunction', slots },
        replies: [
          `【功能描述确认卡】

${slots.functionDescription}

（${slots.functionDescription?.length ?? 0}/500）

技术联系人“${slots.contact}”、联系方式 ${slots.phone}、接入方式 ${slots.accessMethod}、接口地址、来源“${slots.source}”、供应商“${slots.vendor}”均已识别，稍后汇总一并确认。

确认吗？（点【确认】、说“确认”或打字均可）`,
        ],
        quickActions: ['确认', '修改功能描述'],
      };
    }
    case 'confirmFunction': {
      if (!yes) {
        slots.functionDescription = normalized.slice(0, 500);
      }
      slots.connectivity = '失败：认证不通过（401）';
      return {
        flow: { ...flow, step: 'connectivityFix', slots },
        replies: [
          `正在对接口地址 ${slots.endpoint} 发起联通测试……

测试失败：认证不通过（401）。请核对 API key。`,
        ],
        quickActions: ['key 尾号改成 a9f2，重测'],
      };
    }
    case 'connectivityFix': {
      slots.apiKeyMasked = '********a9f2';
      slots.connectivity = '通过（320ms）';
      return {
        flow: { ...flow, step: 'materialConfirm', slots },
        replies: [
          `已更新 API key（仍密文保存），重新测试通过，响应正常（耗时 320ms）。

字段已齐。核验备案材料：

- 技术规格书：已上传，内容达标，将转为 PDF 留存
- 产品说明书：尚未提供

我已依据已填字段自动生成《产品说明书（自动生成）.pdf》，含产品名称、简介、主要功能、开发单位及技术联系人、产品版本。请预览确认，可以回复“就用它”；要改就说改哪儿。`,
        ],
        quickActions: ['就用它', '修改产品简介'],
      };
    }
    case 'materialConfirm': {
      slots.materials = ['技术规格书.pdf（由上传材料转换）', '产品说明书（自动生成）.pdf'];
      return {
        flow: { ...flow, step: 'summary', slots },
        replies: [buildAccessSummary(slots)],
        quickActions: ['确认提交', '修改接口地址', '修改联系人'],
      };
    }
    case 'summary': {
      if (/修改/.test(normalized)) {
        return {
          flow: { ...flow, step: 'summary', slots },
          replies: ['演示版已收到修改诉求。为快速走通接入申请，请直接回复“确认提交”；如需完整字段编辑，我可以继续扩展该分支。'],
          quickActions: ['确认提交'],
        };
      }
      return {
        flow: { ...flow, step: 'done', slots },
        replies: [
          `接入注册申请已提交！

- 智能体编号：${slots.departmentCode ?? '0503'}-0001（按“科室编号-准入顺序号”自动生成）
- 名称：${slots.agentName ?? '内分泌糖尿病随访管理助手'}
- 版本：${slots.version ?? '2.1'}

本次接入注册申请到此完成，感谢您的办理！`,
        ],
        link: { to: '/app/agent-center', text: '查看接入申请' },
      };
    }
    default:
      return {
        flow,
        replies: ['接入注册申请已完成，本场景结束。'],
      };
  }
}

function buildAccessSummary(slots: AccessSlots): string {
  return `都齐了，核对一遍：

- 名称：${slots.agentName ?? '内分泌糖尿病随访管理助手'}
- 版本：${slots.version ?? '2.1'}
- 所属科室：${slots.departmentCode ?? '0503'} ${slots.department ?? '内分泌科'}
- 诊疗环节：${slots.clinicStage ?? '其他（出院后随访管理）'}
- 功能描述：${slots.functionDescription ?? buildAccessFunctionDescription()}
- 来源：${slots.source ?? '合作研发'}
- 供应商：${slots.vendor ?? '智医健康科技有限公司'}
- 技术联系人：${slots.contact ?? '陈明'}
- 联系方式：${slots.phone ?? '13812345678'}
- 接入方式：${slots.accessMethod ?? 'API'}
- 接口地址：${slots.endpoint ?? 'https://api.xxhealth.com/dm-followup/v2'}
- API key：********
- 备案材料：${(slots.materials ?? ['技术规格书.pdf（由上传材料转换）', '产品说明书（自动生成）.pdf']).join('、')}
- 联通测试：${slots.connectivity ?? '通过（320ms）'}

哪项要改直接说/点，没问题就说“提交”或点【确认提交】。`;
}

function getLedgerReply(
  text: string,
  role: '信息科管理员' | '科室管理员',
): {
  module: string;
  reply: string;
  link?: { to: string; text: string };
  quickActions?: string[];
} {
  const normalized = text.trim();
  const scope = role === '信息科管理员' ? '全院' : '本科室';

  if (/排班|挂号|天气|新闻|请假|报销|采购|工资|医保结算/.test(normalized)) {
    return {
      module: '台账查询 / 跑偏拉回',
      reply: `我们先看台账，稍后再为您解决此问题。\n\n台账这边还需要看什么？例如智能体数量、告警情况、运行趋势、360 画像或管理情况报告。`,
      quickActions: ledgerRecommendedQuestions,
    };
  }

  if (/明年|未来|预测|能到多少|还没接入|外部平台|患者隐私明文|API ?key|密钥/.test(normalized)) {
    return {
      module: '台账查询 / 超范围',
      reply:
        '问题超出平台现有信息，我们将持续优化完善哟~\n\n目前我能提供的是已纳管智能体的**近 30 天运行趋势**、**历史调用量**、**告警清单**和**360 画像**。需要我切到哪个方向？',
      quickActions: ['查看近 30 天运行趋势', '查看当前告警情况', '查看某智能体 360 画像'],
    };
  }

  if (/报告|汇报|导出|管理情况|速读|订阅/.test(normalized)) {
    return {
      module: '台账查询 / 管理情况报告',
      reply: `已生成《智能体管理情况报告》草稿（${scope} · 今日）。

报告包含五个模块：

1. 规模与分布：已纳管智能体 **48 个**，覆盖科室 **18/24**，覆盖率 **75%**
2. 运行与调用：今日调用 **12,348 次**，正常运行率 **98.6%**
3. 异常告警与故障：今日告警 **8 次**，其中 P0 **1 次**、P1 **2 次**
4. 风险分级：高度关注 **3 个**，中度关注 **9 个**，一般关注 **36 个**
5. 准入评测进度：本月评测 **15 个**，通过率 **73.3%**

草稿已进入编辑页，可在线编辑、批注、导出 Word/PDF。也可以订阅「每日/每周台账速读」。`,
      link: { to: '/app/ledger-demo/report', text: '打开报告草稿' },
      quickActions: ['订阅每周台账速读', '导出 PDF', '查看告警清单'],
    };
  }

  if (/风险分级|高度关注|中度关注|一般关注/.test(normalized)) {
    return {
      module: '台账查询 / 风险分级',
      reply:
        '当前风险分级如下：\n\n- 高度关注：**3 个**，占比 6.25%，主要集中在连续告警与评测低分场景\n- 中度关注：**9 个**，占比 18.75%，主要为接口抖动、时延偏高\n- 一般关注：**36 个**，占比 75%，运行平稳\n\n口径：已纳管智能体的初步/复核风险分级，只呈现不改判。可继续下钻高度关注清单或查看单个智能体风险依据。',
      link: { to: '/app/ledger/list', text: '查看风险分级清单' },
      quickActions: ['查看高度关注清单', '查看风险依据', '生成今日全院报告'],
    };
  }

  if (/对比同类|同类智能体|同类对比/.test(normalized)) {
    return {
      module: '台账查询 / 同类对比',
      reply:
        '已按「慢病随访类智能体」进行同类对比：\n\n- 糖尿病随访管理助手：成功率 **99.1%**，平均时延 **320ms**，准入评测 **88 分**\n- 高血压随访助手：成功率 **98.7%**，平均时延 **360ms**，准入评测 **86 分**\n- 肿瘤随访助手：成功率 **98.2%**，平均时延 **410ms**，准入评测 **84 分**\n\n结论：糖尿病随访管理助手运行表现优于同类均值，主要短板是 LIS 连接偶发抖动。',
      link: { to: '/app/ledger/profile/0503-0001', text: '查看同类对比详情' },
    };
  }

  if (/画像|360|糖尿病|随访|0503|某智能体|智能导诊|处方审核|影像分析/.test(normalized)) {
    const agentName = /导诊/.test(normalized)
      ? '智能导诊系统'
      : /处方/.test(normalized)
        ? '处方审核系统'
        : /影像/.test(normalized)
          ? '影像分析平台'
          : '糖尿病随访管理助手';
    return {
      module: '台账查询 / 360 画像',
      reply: `为您找到【0503-0001 ${agentName} · v2.1】，这是它的 360 画像：

- 实体信息：所属科室「内分泌科」，诊疗环节「出院后随访」，来源「合作研发」，供应商「智医科技」
- 接入方式：技术 API；API key：**密文展示，不外泄**
- 关联资源拓扑：对接 HIS、LIS、随访管理库；其中 LIS 近 24h 有 1 次连接抖动
- 准入评测：总分 **88 分**；数据安全 91、模型安全 86、权限合规 89；近 3 次评测趋势稳定
- 运行监测：近 30 天调用 **8.2k**，成功率 **99.1%**，平均时延 **320ms**，在线状态「正常」

需要继续看**风险依据**、**资源明细**、**运行趋势**，还是**对比同类智能体**？`,
      link: { to: '/app/ledger/profile/0503-0001', text: '查看完整 360 画像' },
      quickActions: ['风险依据', '资源明细', '运行趋势', '对比同类智能体'],
    };
  }

  if (/风险依据|为什么.*风险|处置/.test(normalized)) {
    return {
      module: '台账查询 / 画像下钻',
      reply:
        '风险依据如下：\n\n- 近 30 天出现 **2 次**资源连接抖动，影响范围较小\n- 最近一次准入评测「模型安全」维度为 **86 分**，低于同类均值 2 分\n- 未发现越权调用；敏感配置均为密文托管\n\n建议：优先复核 LIS 连接稳定性，并在下次评测前补充异常回退策略。',
      link: { to: '/app/ledger/profile/0503-0001', text: '进入画像风险页' },
    };
  }

  if (/资源明细|对接.*系统|拓扑|HIS|LIS/.test(normalized)) {
    return {
      module: '台账查询 / 资源拓扑',
      reply:
        '资源明细如下：\n\n- HIS：读取患者基础信息、就诊记录，状态正常\n- LIS：读取检验指标，近 24h 有 1 次连接抖动\n- 随访管理库：写入随访计划和执行结果，状态正常\n- 消息网关：推送随访提醒，状态正常\n\nAPI key 与连接密钥均按平台安全规则密文展示。',
      link: { to: '/app/resource-center/resources', text: '查看资源明细' },
    };
  }

  if (/趋势|用得怎样|调用趋势|近 ?30 ?天/.test(normalized)) {
    return {
      module: '台账查询 / 运行趋势',
      reply:
        '近 30 天运行趋势：\n\n- 调用量：**8.2k**，较上个 30 天增长 **12.4%**\n- 成功率：**99.1%**，整体稳定\n- 平均时延：**320ms**，P95 为 **710ms**\n- 高峰时段：工作日 09:00–11:00、14:00–16:00\n\n可继续下钻到失败明细、慢调用样本或按科室使用排行。',
      link: { to: '/app/monitoring/business', text: '查看运行监控' },
    };
  }

  if (/告警|异常|故障|P0|P1/.test(normalized)) {
    return {
      module: '台账查询 / 总体指标',
      reply: `今日异常告警 **8 次**。

统计口径：${scope}已纳管智能体，接入运行后产生的告警；时间范围为今日 00:00 至当前。本周 **39 次**，本月 **152 次**。

下钻方向：

- 点击 **告警 8 次** 可查看告警清单
- 点击 **P0 1 次** 可查看紧急故障
- 点击 **处方审核系统超时** 可查看关联智能体画像

需要我据此生成《智能体管理情况报告》吗？图文并茂，可编辑导出。`,
      link: { to: '/app/monitoring/alert-events', text: '查看告警清单' },
      quickActions: ['生成今日全院报告', '查看 P0 告警', '查看处方审核系统 360 画像'],
    };
  }

  if (/数量|家底|总览|概况|科室|覆盖率|调用量|分类|分布|已上线|正常运行率|新增/.test(normalized)) {
    return {
      module: '台账查询 / 总体指标',
      reply: `${scope}智能体台账概况如下：

1. 直答结论：已纳管智能体 **48 个**，覆盖科室 **18/24**，科室覆盖率 **75%**；今日总调用量 **12,348 次**，正常运行率 **98.6%**
2. 统计口径：已审核纳管智能体；时间范围为截至今日，调用与运行指标为今日 00:00 至当前
3. 下钻入口：可点 **智能体 48 个** 看清单，点 **科室覆盖率 75%** 看科室分布，点 **今日调用 12,348 次** 看运行排行
4. 报告引导：需要我据此生成《智能体管理情况报告》吗？图文并茂，可在线编辑并导出 Word/PDF

科室分布 TOP3：影像科 12 个、检验科 8 个、心内科 6 个。诊疗环节以辅助诊断、辅助检查、用药审核为主。`,
      link: { to: '/app/ledger/list', text: '查看台账清单' },
      quickActions: ['生成今日全院报告', '查看科室分布', '查看风险分级'],
    };
  }

  if (/看哪个|哪个智能体|不确定|随便/.test(normalized)) {
    return {
      module: '台账查询 / 澄清',
      reply:
        '请问看哪个智能体？可报名称或编号，例如「糖尿病随访管理助手」「0503-0001」「处方审核系统」。',
      quickActions: ['糖尿病随访管理助手 360 画像', '处方审核系统 360 画像', '智能导诊系统 360 画像'],
    };
  }

  return {
    module: '台账查询 / 澄清',
    reply:
      '我可以查台账总体指标、生成管理情况报告、查看当前告警，或打开某个智能体的 360 画像。您想看哪一类？',
    quickActions: ledgerRecommendedQuestions,
  };
}

function normalizeDepartment(text: string): string {
  if (/超声|B超|彩超/.test(text)) return '超声医学科';
  if (/影像|放射|CT|核磁|MRI/.test(text)) return '医学影像科';
  if (/心内|心血管/.test(text)) return '心内科';
  if (/急诊/.test(text)) return '急诊科';
  if (/检验/.test(text)) return '检验科';
  const match = text.match(/([\u4e00-\u9fa5]{2,8}科)/);
  return match?.[1] ?? '超声医学科';
}

function inferClinicStage(text: string): string {
  if (/预约|检查|超声|CT|检验|检前|报告/.test(text)) return '辅助检查';
  if (/诊断|判读|辅助诊断/.test(text)) return '辅助诊断';
  if (/导诊|分诊/.test(text)) return '导诊分诊';
  if (/预问诊|问诊/.test(text)) return '预问诊';
  if (/住院/.test(text)) return '住院';
  if (/手术/.test(text)) return '手术';
  return '辅助检查';
}

function buildFunctionDescription(slots: RequirementSlots, detailText: string): string {
  const raw = slots.rawNeed ?? '建设智能体';
  const department = slots.department ?? normalizeDepartment(`${raw} ${detailText}`);
  if (/超声|预约|检前|检查/.test(`${raw} ${detailText}`)) {
    return '面向门诊患者提供超声检查智能预约与检前指导服务。系统读取医生开具的检查申请单、检查项目、号源排班、患者基础信息与联系方式，自动推荐或安排合适检查时段，并通过微信服务号等渠道发送预约结果、空腹/憋尿等检前准备事项及改约提醒，输出预约结果单与检前指导消息。';
  }
  return `面向${department}业务人员与患者提供智能体辅助服务。系统结合用户提交的需求描述、业务单据、院内系统数据和知识库内容，自动完成信息汇总、流程提醒、结果生成与消息推送，输出可执行的业务建议、处理结果和待办提醒。`;
}

function buildReason(text: string): string {
  if (/超声|预约|排队|白跑|检前|改约|投诉/.test(text)) {
    return '目前超声检查预约主要依赖人工调度，患者排队等待时间长，检前准备事项告知不充分，容易出现当天无法检查、反复改约和投诉增多等问题。建设该智能体后，可提升预约效率与检前告知准确性，减少患者白跑和窗口人工沟通成本。';
  }
  return `当前业务处理中存在人工沟通成本高、信息分散、处理效率不稳定等问题。建设该智能体后，可将关键流程自动化、标准化，减少重复劳动，提升响应速度与服务一致性。`;
}

function buildResources(text: string): string {
  if (/HIS|RIS|超声|微信|服务号|预约/.test(text)) {
    return '业务系统：HIS、超声预约系统（RIS）、微信服务号；模型能力：大语言模型 + 规则调度引擎，由平台建议默认模型。';
  }
  return text.includes('不清楚') || text.includes('平台建议')
    ? '业务系统：HIS/EMR 等相关业务系统按评审结果接入；模型能力：大语言模型 + 规则引擎，由平台建议默认模型。'
    : text;
}

function extractContact(text: string): { proposer?: string; phone?: string; phoneValid: boolean } {
  const phone = text.match(/\d{11,12}/)?.[0];
  const name = text.match(/[\u4e00-\u9fa5]{2,10}/)?.[0]?.replace(/手机|电话|联系|方式/g, '');
  return {
    proposer: name && name.length >= 2 ? name : undefined,
    phone,
    phoneValid: Boolean(phone && /^\d{11}$/.test(phone)),
  };
}

function buildRequirementSummary(slots: RequirementSlots): string {
  return `【汇总确认卡】（第 8 步/共 8 步）

- 提出科室：${slots.department ?? '超声医学科'}【修改】
- 诊疗环节：${slots.clinicStage ?? '辅助检查'}【修改】
- 功能描述：${slots.functionDescription ?? '待补充'}【修改】
- 提出原因：${slots.reason ?? '待补充'}【修改】
- 所需资源：${slots.resources ?? '待补充'}【修改】
- 需求紧急程度：${slots.urgency ?? '中'}【修改】
- 提出人：${slots.proposer ?? '待补充'}
- 联系方式：${slots.phone ?? '待补充'}【修改】

无误请回复「提交」或点击/语音确认；需要调整可回复「修改 + 字段名」。`;
}

function buildRequirementSuccess(slots: RequirementSlots): string {
  const time = '2026-07-10 11:16';
  const title = /超声|预约|检前/.test(slots.functionDescription ?? '')
    ? '超声检查智能预约与检前指导助手'
    : '智能体建设需求登记';
  return `【需求生成成功卡】

需求已生成！

- 需求标题：《${title}》（已查重）
- 序号：143
- 提出时间：${time}
- 需求文档查看/下载：Word、PDF 版

正在为您自动执行智能化匹配……

【匹配结果卡】

1. AGT-0087 检查预约调度助手 —— **82%**（最高）
2. AGT-0102 患者服务通知助手 —— **64%**
3. AGT-0056 门诊智能预问诊助手 —— **41%**

「匹配情况」已回填 **82%**。您可以继续说「查看文档」或点击下方入口查看详情。`;
}

function getRequirementNext(flow: RequirementFlow, text: string): { flow: RequirementFlow; replies: string[]; link?: { to: string; text: string } } {
  const slots = { ...flow.slots };
  const normalized = text.trim();
  const yes = /^(对|是|确认|可以|没问题|准确|正确|好|嗯|提交)[。！!.\s]*$/.test(normalized);

  switch (flow.step) {
    case 'n0': {
      slots.rawNeed = normalized;
      slots.department = normalizeDepartment(normalized);
      return {
        flow: { ...flow, step: 'confirmDept', slots },
        replies: [`先确认科室：这条需求以【${slots.department}】名义提出，对吗？\n\n可回复「对」，或直接告诉我正确科室。`],
      };
    }
    case 'confirmDept': {
      if (!yes) slots.department = normalizeDepartment(normalized);
      return {
        flow: { ...flow, step: 'functionDetails', slots },
        replies: ['这个助手主要服务谁？需要读取哪些信息、最终输出什么结果？（第 2 步/共 8 步）'],
      };
    }
    case 'functionDetails': {
      slots.functionDescription = buildFunctionDescription(slots, normalized);
      slots.clinicStage = inferClinicStage(`${slots.rawNeed ?? ''} ${normalized}`);
      return {
        flow: { ...flow, step: 'confirmFunction', slots },
        replies: [`【功能描述确认卡】\n\n${slots.functionDescription}\n\n（约 ${slots.functionDescription.length}/500 字）\n\n确认吗？可回复「确认」，或直接说明要修改的内容。`],
      };
    }
    case 'confirmFunction': {
      if (!yes) slots.functionDescription = buildFunctionDescription(slots, normalized);
      return {
        flow: { ...flow, step: 'reason', slots },
        replies: ['为什么要建它？目前流程怎么做、主要痛点是什么？（第 3 步/共 8 步）'],
      };
    }
    case 'reason': {
      if (/查一下|状态|评审能过|先帮我/.test(normalized)) {
        slots.sidetrack = [...(slots.sidetrack ?? []), normalized];
        return {
          flow: { ...flow, step: 'reason', slots },
          replies: ['我们先来完成智能体建设需求登记，稍后再为您解决此问题。\n\n刚才说到：目前流程怎么做、主要痛点是什么？'],
        };
      }
      slots.reason = buildReason(normalized);
      return {
        flow: { ...flow, step: 'confirmReason', slots },
        replies: [`【提出原因确认卡】\n\n${slots.reason}\n\n（约 ${slots.reason.length}/300 字）\n\n确认吗？`],
      };
    }
    case 'confirmReason': {
      if (!yes) slots.reason = buildReason(normalized);
      return {
        flow: { ...flow, step: 'clinicStage', slots },
        replies: [`诊疗环节我判断为【${slots.clinicStage ?? '辅助检查'}】，对吗？\n\n如不准确请选择：导诊分诊 / 预问诊 / 预约挂号 / 辅助检查 / 辅助诊断 / 辅助治疗 / 住院 / 手术 / 其他。（第 4 步/共 8 步）`],
      };
    }
    case 'clinicStage': {
      if (!yes) slots.clinicStage = normalized.replace(/[。.!！]/g, '').slice(0, 20);
      return {
        flow: { ...flow, step: 'resources', slots },
        replies: ['需要对接哪些业务系统？比如 HIS、超声预约系统（RIS）、微信服务号等；模型方面有想法也可以说，没有就由平台建议。（第 5 步/共 8 步）'],
      };
    }
    case 'resources': {
      slots.resources = buildResources(normalized);
      const sidetrack = /评审能过|靠谱吗|能不能通过/.test(normalized)
        ? '\n\n我们先来完成智能体建设需求登记，稍后再为您评估评审通过要点。'
        : '';
      return {
        flow: { ...flow, step: 'urgency', slots },
        replies: [`所需资源记录为：${slots.resources}${sidetrack}\n\n请选择需求紧急程度：【高】【中】【低】（第 6 步/共 8 步）`],
      };
    }
    case 'urgency': {
      slots.urgency = /高/.test(normalized) ? '高' : /低/.test(normalized) ? '低' : '中';
      return {
        flow: { ...flow, step: 'contact', slots },
        replies: ['请留下您的姓名（2–10 个字）与 11 位手机号，仅用于评审沟通。（第 7 步/共 8 步）'],
      };
    }
    case 'contact': {
      const contact = extractContact(normalized);
      if (contact.proposer) slots.proposer = contact.proposer;
      if (contact.phoneValid) {
        slots.phone = contact.phone;
        return {
          flow: { ...flow, step: 'summary', slots },
          replies: [buildRequirementSummary(slots)],
        };
      }
      return {
        flow: { ...flow, step: 'contactFix', slots },
        replies: [`${slots.proposer ? '姓名已记录。' : ''}手机号有误——请输入正确的11位手机号。`],
      };
    }
    case 'contactFix': {
      const contact = extractContact(normalized);
      if (!contact.phoneValid) {
        return {
          flow: { ...flow, step: 'contactFix', slots },
          replies: ['请输入正确的11位手机号。'],
        };
      }
      slots.phone = contact.phone;
      return {
        flow: { ...flow, step: 'summary', slots },
        replies: [buildRequirementSummary(slots)],
      };
    }
    case 'summary': {
      if (/修改/.test(normalized)) {
        return {
          flow: { ...flow, step: 'summary', slots },
          replies: ['演示版已收到修改诉求。为了快速走通流程，您可以直接回复「提交」生成需求；如需我补做字段修改，我也可以继续扩展这段交互。'],
        };
      }
      return {
        flow: { ...flow, step: 'done', slots },
        replies: [buildRequirementSuccess(slots)],
        link: { to: '/app/agent-needs', text: '查看详情' },
      };
    }
    default:
      return {
        flow,
        replies: ['需求登记已完成。您可以查看需求文档或进入需求详情页。'],
        link: { to: '/app/agent-needs', text: '查看详情' },
      };
  }
}

export default HomePage;
