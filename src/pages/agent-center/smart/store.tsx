/**
 * 智能填写草稿 store
 *
 * §3.1.1 Agent 对话浮层 写入识别结果 → §3.1.2 新建注册页 读取并预填
 * 通过 React Context 在同一棵组件树内共享, 避免与既有 store.ts 冲突。
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AgentMessage,
  AIPrefillMeta,
  ReviewProblem,
  ReviewSummary,
  ConnStep,
  ConnDiagnostics,
  HistoricalPlan,
  InsightProgress,
} from './types';

// ──────────────────────────────────────────────────────────────────────
// 默认初始会话：首次唤起浮层时, 给用户一段欢迎语 + 分步引导
// ──────────────────────────────────────────────────────────────────────

const initialMessages: AgentMessage[] = [
  {
    id: 'm-welcome',
    role: 'agent',
    type: 'text',
    content:
      '你好！我是「智能填写助手」。我可以帮你把产品说明书 / 技术规格书 / 图片 / 链接里的内容自动识别并填到右侧表单, 你只需核对确认即可。',
    timestamp: '2026-06-30 09:30:00',
  },
  {
    id: 'm-guide',
    role: 'agent',
    type: 'text',
    content:
      '请先上传「产品说明书」与「技术规格书」PDF, 或者直接把链接 / 图片丢给我, 也可以直接打字描述你想接入的智能体。',
    timestamp: '2026-06-30 09:30:02',
  },
];

export type WelcomePageKey =
  // 提供方侧列表 (各 Tab)
  | 'agent-center-all'          // 「全部」Tab — 提供方/管理方 文案不同
  | 'agent-center-draft'       // 「草稿」Tab
  | 'agent-center-pending'     // 「待审核」Tab
  | 'agent-center-return'      // 「退回修改」Tab
  | 'agent-center-cancel'      // 「撤销修改」Tab
  | 'agent-center-passed'      // 「审核通过」Tab
  // 提供方侧单页
  | 'smart-register'           // 新建注册页
  | 'agent-center-detail'      // 注册信息详情页
  // 管理方侧单页
  | 'agent-center-audit';      // 审核注册页

/** PRD §3.1.1: 同一页面在「智能体提供方」与「智能体管理方」下文案可能完全不同 */
export type WelcomeRole = 'provider' | 'admin';

/**
 * PRD §3.1.1 欢迎语表（窗口内 + 机器人旁气泡同步展示）
 * - 提供方（科室管理员、信息科管理员作为申请人）见 pageRole='provider'
 * - 管理方（信息科管理员作为审核人）见 pageRole='admin'
 *   目前仅 agent-center-all 与 agent-center-audit 在两角色下文案不同；
 *   其余页面两角色走同一句欢迎语。
 */
const WELCOME_GREETINGS: Record<WelcomePageKey, Record<WelcomeRole, string>> = {
  'agent-center-all': {
    provider:
      '你好！我是医小管。点击【新建注册】，把产品说明书 / 技术规格书 PDF（或链接 / 图片）丢给我，我来帮你自动识别并填表～',
    admin:
      '今日待审查 X 个、准入通过 X 个、退回修改 X 个。点击对应状态卡片可直接进入处理～',
  },
  'agent-center-draft': {
    provider:
      '你还有 N 条未完成的草稿，需要我帮你继续补全吗？点开任意草稿，我接着帮你填。',
    admin:
      '你还有 N 条未完成的草稿，需要我帮你继续补全吗？点开任意草稿，我接着帮你填。',
  },
  'agent-center-pending': {
    provider:
      '这里是已提交、正在等待审核的智能体，我会帮你盯进度，有审核结果第一时间提醒你。',
    admin:
      '这里是已提交、正在等待审核的智能体，我会帮你盯进度，有审核结果第一时间提醒你。',
  },
  'agent-center-return': {
    provider:
      '有 N 条被退回啦，别担心～我已整理好退回意见和问题点，点开我陪你逐条改好再提交。',
    admin:
      '有 N 条被退回啦，别担心～我已整理好退回意见和问题点，点开我陪你逐条改好再提交。',
  },
  'agent-center-cancel': {
    provider:
      '这些是你撤销的注册，需要我帮你快速修改后重新提交吗？',
    admin:
      '这些是你撤销的注册，需要我帮你快速修改后重新提交吗？',
  },
  'agent-center-passed': {
    provider:
      '恭喜！这些智能体已通过接入🎉 需要我带你去完善台账，或发起准入评测吗？',
    admin:
      '恭喜！这些智能体已通过接入🎉 需要我带你去完善台账，或发起准入评测吗？',
  },
  'smart-register': {
    provider:
      '你好！我是医小管。先上传「产品说明书」与「技术规格书」PDF，或直接把链接 / 图片发我，也可以打字描述你想接入的智能体，我自动识别并填到表单，你核对确认即可。',
    admin:
      '你好！我是医小管。先上传「产品说明书」与「技术规格书」PDF，或直接把链接 / 图片发我，也可以打字描述你想接入的智能体，我自动识别并填到表单，你核对确认即可。',
  },
  'agent-center-detail': {
    provider:
      '这是该智能体的注册详情，需要我帮你解读某个字段，或对比历史填写版本吗？',
    admin:
      '这是该智能体的注册详情，需要我帮你解读某个字段，或对比历史填写版本吗？',
  },
  'agent-center-audit': {
    provider:
      '我已完成预审：标注了 X 个疑似问题并跑了连通测试，预审结论为「XX」，供你二次审核参考，最终以你的决策为准。',
    admin:
      '我已完成预审：标注了 X 个疑似问题并跑了连通测试，预审结论为「XX」，供你二次审核参考，最终以你的决策为准。',
  },
};

/**
 * 把 PRD 文案中的 `X` / `N` 占位符替换为实际计数。
 * 调用方可以传入 `replacer` 函数，按出现顺序返回 字符串数组 — 第一个值替换文案中
 * 第一个 `X` 或 `N`（按扫描顺序），第二个值替换第二个，依此类推。
 *  - 若返回 `undefined`，对应位置保留字面「X」/「N」
 *  - 数组长度不够时，剩余位置保留字面字符
 *  - 数组过长时，多余的值会被忽略
 *
 * 例:文案 `"待审查 X 个、退回 X 个、关键词 XX"` + 返回 `["3","5","接入异常"]` →
 *     `"待审查 3 个、退回 5 个、关键词 接入异常"`
 */
export type WelcomeReplacer = (
  key: WelcomePageKey,
  role: WelcomeRole,
) => Array<string | number> | undefined;

/**
 * §3.1.1 指向性规则「迷你清单」row 上的记录级操作。
 * kind 决定 index.tsx 监听 `agent-bubble-row-action` 后走哪个既有 handler：
 *  navigate-detail → goDetail / navigate-edit → goEdit / navigate-audit → goAudit
 *  confirm-delete → setPendingDelete / confirm-cancel → setPendingCancel
 *  navigate-eval → 立即评测（带 path）/ navigate-ledger → 查看台账
 */
export type WelcomeMiniRowActionKind =
  | 'navigate-detail'
  | 'navigate-edit'
  | 'navigate-audit'
  | 'confirm-delete'
  | 'confirm-cancel'
  | 'navigate-eval'
  | 'navigate-ledger';

export interface WelcomeMiniRowAction {
  key: string;
  label: string;
  kind: WelcomeMiniRowActionKind;
  /** navigate-eval 等需要显式 path 时携带 */
  path?: string;
  danger?: boolean;
}

export interface WelcomeMiniRow {
  recordId: string;
  title: string;
  subTitle?: string;
  meta?: string;
  actions: WelcomeMiniRowAction[];
}

/** §3.1.1 列表页气泡「迷你清单」描述符（前 3–5 条 + 每条记录级按钮 + 查看全部） */
export interface WelcomeMiniList {
  /** 折叠态按钮文案，如「去补全 3 条草稿」 */
  toggleLabel: string;
  /** 「查看全部」跳转目标 Tab（RegisterStatus 值，经 agent-jump-tab 派发） */
  targetTab: string;
  rows: WelcomeMiniRow[];
  /** 该 Tab 命中的总条数（可能 > rows.length，用于「查看全部 (N)」） */
  totalCount: number;
}

/**
 * Agent 对话窗口上传文件后,同步到「备案材料」列表的桥接状态。
 * - 由 AgentAssistant.handleUpload 在 PDF 校验通过后写入
 * - Registration 订阅此值,append 到本地 fileList 后调用 clearUploadedFile 置空
 * - 用单一 buffer 而非数组避免重复 append；同一文件不重复写（按 uid 去重）
 */
export interface UploadedFileBridge {
  uid: string;
  name: string;
  size: number;
  type?: string;
}

/**
 * §3.2.1 § 智能预审问题气泡的紧凑版摘要（机器人旁浮窗气泡同步展示用）。
 *   - 只取前 3 条 + 总数, 不在气泡里堆叠完整列表
 *   - id 用于气泡内「定位到字段/采纳/忽略」三个 link 按钮 → 通过既有
 *     agent-issue-adopt / agent-issue-ignore / agent-review-locate-field CustomEvent 派发,
 *     与 ChatPanel 内完整气泡共享同一套消费回路
 */
export interface WelcomePreviewProblem {
  id: string;
  title: string;
  severity: ReviewProblem['severity'];
  fieldKey?: string;
  category?: ReviewProblem['category'];
}

interface SmartDraftCtx {
  messages: AgentMessage[];
  addMessage: (m: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  /**
   * 带 id 前缀地插入消息: 生成的 id 形如 `<idPrefix>-<random>`, 上层可按 prefix 移除
   * (用于 §3.4.1.2 详情页 insight 消息: 切换记录时按 tag 清理)
   */
  addTaggedMessage: (idPrefix: string, m: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  appendToLastAgent: (patch: Partial<AgentMessage>) => void;
  clearMessages: () => void;
  /** §3.4.1.2 详情页切换记录时, 按 tag prefix 清理旧的 insight 消息避免堆叠 */
  removeMessagesByTag: (tagPrefix: string) => void;

  /** 当前被唤起页面的 page-level 欢迎语；用于机器人旁气泡同步显示 */
  activeWelcome: {
    pageKey: WelcomePageKey;
    role: WelcomeRole;
    content: string;
    at: number;
    /** §4.1.1 列表页态势气泡：可点状态 chip，点击跳对应状态 tab */
    chips?: Array<{ key: string; label: string; targetTab?: string; tone?: 'default' | 'warning' | 'success' | 'error' }>;
    /**
     * §3.1.1 气泡快捷操作按钮（单记录页直接操作 + 列表页一键直达）。
     * path 与 event 二选一：优先派发 event（window.dispatchEvent），否则跳 path。
     */
    actions?: Array<{ key: string; label: string; path?: string; event?: string; enabled: boolean; reason?: string }>;
    /**
     * §3.1.1 指向性规则（列表页多记录）：气泡按钮展开「迷你清单」，
     * 每条自带记录级按钮，底部「查看全部」回到对应 Tab。单记录页用 actions。
     */
    miniList?: WelcomeMiniList;
    /**
     * §3.2.1 智能预审问题气泡的紧凑版(仅在新注册页同步审查时使用)：
     *   机器人旁气泡内可点开前 N 条 + 每条三个 link 按钮（定位/采纳/忽略）。
     *   - 完整列表请在打开浮层后的对话窗口内查看（pre-audit-issue）
     *   - 由 SmartRegistrationForm.runReview 每次重新写入,
     *     pushWelcomeGreeting 清空后随之消费
     */
    previewProblems?: {
      total: number;
      items: WelcomePreviewProblem[];
    };
  } | null;
  pushWelcomeGreeting: (
    pageKey: WelcomePageKey,
    role?: WelcomeRole,
    replacer?: WelcomeReplacer,
    extras?: {
      chips?: Array<{ key: string; label: string; targetTab?: string; tone?: 'default' | 'warning' | 'success' | 'error' }>;
      actions?: Array<{ key: string; label: string; path?: string; event?: string; enabled: boolean; reason?: string }>;
      miniList?: WelcomeMiniList;
      previewProblems?: { total: number; items: WelcomePreviewProblem[] };
    },
  ) => void;
  /**
   * §3.2.1 仅更新机器人旁气泡的「智能预审问题紧凑版」内容。
   *   - 不会重写 activeWelcome.content 标题行, 仅改 previewProblems 字段
   *   - 若气泡已被消费(consumeWelcome()), 等待下一次 pushWelcomeGreeting 后再写入
   *   - pushWelcomeGreeting 调用时若 extras.previewProblems 已存在, 它会作为初始值
   *     接管, 调用方在审查过程中按 onValuesChange 节流后调用本方法
   */
  setWelcomePreviewProblems: (preview: { total: number; items: WelcomePreviewProblem[] } | null) => void;
  consumeWelcome: () => void;

  /** Agent 写入的「待采纳」预填字段, key → 字段值 */
  pendingPrefills: Record<string, string>;
  /** AI 预填元数据: 置信度 / 来源 / 用户是否采纳 */
  prefillMeta: Record<string, AIPrefillMeta>;
  applyPrefill: (
    fields: Array<{ fieldKey: string; value: string; confidence: number; source: string }>,
  ) => void;
  acknowledgePrefill: (fieldKey: string) => void;
  /** 用户手动修改某字段后, 自动清除该字段的 AI 预填状态 */
  clearPrefill: (fieldKey: string) => void;

  /** 待采纳的纠错建议 */
  pendingFixes: Array<{
    fieldKey: string;
    currentValue: string;
    suggestedValue: string;
    reason: string;
  }>;
  addFixSuggestion: (s: {
    fieldKey: string;
    currentValue: string;
    suggestedValue: string;
    reason: string;
  }) => void;
  applyFix: (fieldKey: string) => void;
  dismissFix: (fieldKey: string) => void;

  // §3.2 填写内容智能审查
  reviewProblems: ReviewProblem[];
  reviewSummary: ReviewSummary;
  setReviewProblems: (problems: ReviewProblem[]) => void;
  ignoreProblem: (id: string) => void;
  confirmProblem: (id: string) => void;
  applyAutoFix: (id: string) => void;
  rollbackAutoFix: (id: string) => void;

  // §3.3 智能化连通测试
  connSteps: ConnStep[];
  setConnSteps: (steps: ConnStep[]) => void;
  connDiagnostics: ConnDiagnostics | null;
  setConnDiagnostics: (d: ConnDiagnostics | null) => void;
  historicalPlans: HistoricalPlan[];
  setHistoricalPlans: (p: HistoricalPlan[]) => void;
  /** 最近一次连通测试的「脱敏配置」沉淀为知识库（演示用） */
  saveHistoricalPlan: (plan: Omit<HistoricalPlan, 'id'>) => void;
  /**
   * 向对话窗口推送一条「历史方案复用」消息（§3.3.2）
   *   - 同一 source 仅保留最新一条，避免堆叠
   *   - plans 为空时不上推
   */
  pushHistoricalPlans: (
    plans: HistoricalPlan[],
    source: 'test-fail' | 'test-pass' | 'page-init',
  ) => void;

  // §3.4 接入结果洞察与汇报
  insightProgress: InsightProgress | null;
  setInsightProgress: (p: InsightProgress | null) => void;

  /**
   * §3.1.1 Agent 对话窗口上传文件 → 同步到「备案材料」列表
   * - 写入后由 Registration 监听消费, 消费完调用 clearUploadedFile 置空
   * - 用 single buffer（而非数组）避免重复 append；同 uid 替换而非追加
   */
  pendingUploadedFile: UploadedFileBridge | null;
  syncUploadedFile: (file: UploadedFileBridge) => void;
  clearUploadedFile: () => void;
}

const Ctx = createContext<SmartDraftCtx | null>(null);

let __id = 0;
const nextId = () => `msg-${Date.now()}-${++__id}`;

export const SmartDraftProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<AgentMessage[]>(initialMessages);
  const [pendingPrefills, setPendingPrefills] = useState<Record<string, string>>({});
  const [prefillMeta, setPrefillMeta] = useState<Record<string, AIPrefillMeta>>({});
  const [pendingFixes, setPendingFixes] = useState<SmartDraftCtx['pendingFixes']>([]);
  const [activeWelcome, setActiveWelcome] = useState<SmartDraftCtx['activeWelcome']>(null);
  /**
   * §3.2.1 智能预审气泡的紧凑版草稿：当 activeWelcome 因用户点开/点× 已消费为空时,
   *   后续 runReview 的结果暂存此处; 下一次 pushWelcomeGreeting 调用时
   *   把这份草稿带进新气泡, 实现「审查结果是最新版本」的预期。
   *   - activeWelcome 非空时 setWelcomePreviewProblems 直接覆盖其 previewProblems 字段
   *   - activeWelcome 为空时写入这份草稿; 下一次 pushWelcomeGreeting 的 extras.previewProblems
   *     若未带, 用本 draft 兜底
   */
  const welcomePreviewDraftRef = useRef<{ total: number; items: WelcomePreviewProblem[] } | null>(null);

  // §3.2 填写内容智能审查
  const [reviewProblems, setReviewProblemsState] = useState<ReviewProblem[]>([]);
  // §3.3 智能化连通测试
  const [connSteps, setConnStepsState] = useState<ConnStep[]>([]);
  const [connDiagnostics, setConnDiagnosticsState] = useState<ConnDiagnostics | null>(null);
  const [historicalPlans, setHistoricalPlansState] = useState<HistoricalPlan[]>([]);
  // §3.4 接入结果洞察与汇报
  const [insightProgress, setInsightProgressState] = useState<InsightProgress | null>(null);

  // §3.1.1 Agent 对话窗口 → 备案材料 bridge：单一 buffer，Registration 消费后置空
  const [pendingUploadedFile, setPendingUploadedFile] = useState<UploadedFileBridge | null>(null);

  const addMessage: SmartDraftCtx['addMessage'] = useCallback((m) => {
    setMessages((prev) => [
      ...prev,
      { ...m, id: nextId(), timestamp: formatNow() },
    ]);
  }, []);

  /**
   * 带 id 前缀插入消息（§3.4.1.2 详情页 insight 气泡等场景）。
   * 同一 idPrefix 多次调用会保留多条历史消息，按 idPrefix 移除时一次性清掉。
   */
  const addTaggedMessage: SmartDraftCtx['addTaggedMessage'] = useCallback((idPrefix, m) => {
    setMessages((prev) => [
      ...prev,
      { ...m, id: `${idPrefix}-${nextId()}`, timestamp: formatNow() },
    ]);
  }, []);

  const appendToLastAgent: SmartDraftCtx['appendToLastAgent'] = useCallback((patch) => {
    setMessages((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i -= 1) {
        if (next[i].role === 'agent') {
          next[i] = { ...next[i], ...patch };
          break;
        }
      }
      return next;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * §3.4.1.2 详情页切换记录时, 按 id 前缀清理旧的 insight 消息避免堆叠。
   * 也用于窗口层 agent-insight-clear CustomEvent 监听回调。
   */
  const removeMessagesByTag = useCallback((tagPrefix: string) => {
    if (!tagPrefix) return;
    setMessages((prev) => prev.filter((m) => !m.id.startsWith(tagPrefix)));
  }, []);

  // PRD §3.1.1 表格：进入页面时同时在「对话窗口内 + 机器人旁气泡」展示欢迎语
  // - 同一页面（pageKey + role）重复进入不重复推消息，但机器人旁气泡每次重新弹出
  // - 消息只推一次；机器人旁气泡消耗后由父页面再次进入时重新设置
  // - role 默认 'provider'，提供方 = 科室管理员 + 信息科管理员(作为申请人)
  //   管理方 = 信息科管理员(作为审核人) —— 仅 agent-center-all 与 agent-center-audit 文案不同
  // - replacer 用于把 PRD 文案里的 X / N 占位符替换为实际计数（草稿/退回条数等）
  const pushWelcomeGreeting: SmartDraftCtx['pushWelcomeGreeting'] = useCallback(
    (pageKey, role = 'provider', replacer, extras) => {
      const raw = WELCOME_GREETINGS[pageKey]?.[role];
      if (!raw) return;
      const replacements = replacer?.(pageKey, role);
      let cursor = 0;
      const content = raw.replace(/[XN]/g, (ch) => {
        const v = replacements?.[cursor];
        cursor += 1;
        return v === undefined || v === null ? ch : String(v);
      });
      setActiveWelcome({
        pageKey,
        role,
        content,
        at: Date.now(),
        chips: extras?.chips,
        actions: extras?.actions,
        miniList: extras?.miniList,
        // §3.2.1 智能预审气泡：调用方若显式传 previewProblems, 用之; 否则消费草稿
        //   - 草稿在下一次重审时会被刷新, 实现「气泡内容随表单实时同步」的目标
        previewProblems:
          extras?.previewProblems ?? welcomePreviewDraftRef.current ?? undefined,
      });
      // 推过之后清掉草稿(已迁入 activeWelcome); 下次再变化时由 setWelcomePreviewProblems 再写一份
      if (!extras?.previewProblems) {
        welcomePreviewDraftRef.current = null;
      }
      // 同一页（按 pageKey + role）首次进入：往对话窗口也推一条（带 tag 便于合并去重）
      setMessages((prev) => {
        const tag = `__welcome__:${pageKey}:${role}`;
        if (prev.some((m) => m.content === content && m.id.startsWith(tag))) return prev;
        return [
          ...prev,
          {
            id: `${tag}-${Date.now()}`,
            role: 'agent',
            type: 'text',
            content,
            timestamp: formatNow(),
          },
        ];
      });
    },
    [],
  );

  const consumeWelcome: SmartDraftCtx['consumeWelcome'] = useCallback(() => {
    setActiveWelcome(null);
  }, []);

  /**
   * §3.2.1 仅同步机器人旁气泡的「智能预审问题紧凑版」内容。
   *   - activeWelcome 非空时: 直接修改 previewProblems 字段(不替换整张气泡, 不触发 chips/actions 重新渲染)
   *   - activeWelcome 已消费(气泡被关掉): 写入草稿, 下一次 pushWelcomeGreeting 时随气泡再次呈现
   *   - 传 null 表示「已无问题」, 用来在用户上传完所有文件后让气泡的预警区消失
   */
  const setWelcomePreviewProblems: SmartDraftCtx['setWelcomePreviewProblems'] = useCallback(
    (preview) => {
      setActiveWelcome((prev) => {
        if (!prev) {
          // 气泡已关 → 记入草稿, 留待下次 pushWelcomeGreeting 使用
          welcomePreviewDraftRef.current = preview;
          return prev;
        }
        return { ...prev, previewProblems: preview ?? undefined };
      });
    },
    [],
  );

  const applyPrefill: SmartDraftCtx['applyPrefill'] = useCallback((fields) => {
    setPendingPrefills((prev) => {
      const next = { ...prev };
      fields.forEach((f) => {
        next[f.fieldKey] = f.value;
      });
      return next;
    });
    setPrefillMeta((prev) => {
      const next = { ...prev };
      fields.forEach((f) => {
        // 已有元数据(同字段)累积, 但 acknowledged 状态保留
        const existed = next[f.fieldKey];
        next[f.fieldKey] = {
          fieldKey: f.fieldKey,
          confidence: f.confidence,
          source: f.source,
          acknowledged: existed?.acknowledged ?? false,
          beforeValue: existed?.beforeValue,
          afterValue: existed?.afterValue ?? f.value,
          fixReason: existed?.fixReason,
        };
      });
      return next;
    });
  }, []);

  const acknowledgePrefill: SmartDraftCtx['acknowledgePrefill'] = useCallback((fieldKey) => {
    setPrefillMeta((prev) => {
      if (!prev[fieldKey]) return prev;
      return {
        ...prev,
        [fieldKey]: {
          ...prev[fieldKey],
          acknowledged: true,
          // 采纳时刻戳:Badge 据此显示 5s「✓ 已采纳」绿色对勾后淡出
          acknowledgedAt: Date.now(),
        },
      };
    });
  }, []);

  const clearPrefill: SmartDraftCtx['clearPrefill'] = useCallback((fieldKey) => {
    setPrefillMeta((prev) => {
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  }, []);

  const addFixSuggestion: SmartDraftCtx['addFixSuggestion'] = useCallback((s) => {
    setPendingFixes((prev) => {
      if (prev.some((x) => x.fieldKey === s.fieldKey)) return prev;
      return [...prev, s];
    });
  }, []);

  const applyFix: SmartDraftCtx['applyFix'] = useCallback((fieldKey) => {
    setPendingFixes((prev) => {
      const fix = prev.find((x) => x.fieldKey === fieldKey);
      if (!fix) return prev;
      // 把纠错后的值也作为一次新的 AI 预填写入, 但标注 beforeValue = 原值
      setPendingPrefills((pp) => ({ ...pp, [fieldKey]: fix.suggestedValue }));
      setPrefillMeta((pm) => ({
        ...pm,
        [fieldKey]: {
          fieldKey,
          confidence: 0.95,
          source: 'Agent 自动纠错',
          acknowledged: false,
          beforeValue: fix.currentValue,
          afterValue: fix.suggestedValue,
          fixReason: fix.reason,
        },
      }));
      return prev.filter((x) => x.fieldKey !== fieldKey);
    });
  }, []);

  const dismissFix: SmartDraftCtx['dismissFix'] = useCallback((fieldKey) => {
    setPendingFixes((prev) => prev.filter((x) => x.fieldKey !== fieldKey));
  }, []);

  // ──────────────────────────────────────────────────────────────────
  // §3.2 填写内容智能审查（PRD §3.2.1 / 3.2.2 操作按钮）
  //   - setReviewProblems: 由 Registration.tsx 实时审查后写入
  //   - ignoreProblem / confirmProblem: 用户点击「忽略」「标记已确认」
  //   - applyAutoFix: 用户点击「授权自动修正」（按 id 定位）
  //   - rollbackAutoFix: 用户在「对比卡」点击「回退」恢复原值
  //   自动纠错会把 autoFixValue 注入 pendingPrefills，并把 beforeValue 写到
  //   prefillMeta（与 §3.1 的 AI 预填同源），便于 AIPrefillWrapper 显示已修正 badge。
  // ──────────────────────────────────────────────────────────────────
  const setReviewProblems: SmartDraftCtx['setReviewProblems'] = useCallback((p) => {
    setReviewProblemsState(p);
  }, []);

  const ignoreProblem: SmartDraftCtx['ignoreProblem'] = useCallback((id) => {
    setReviewProblemsState((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'ignored' } : p)),
    );
  }, []);

  const confirmProblem: SmartDraftCtx['confirmProblem'] = useCallback((id) => {
    setReviewProblemsState((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: 'confirmed' } : p)),
    );
  }, []);

  const applyAutoFix: SmartDraftCtx['applyAutoFix'] = useCallback((id) => {
    setReviewProblemsState((prev) => {
      let target: ReviewProblem | undefined;
      const next = prev.map((p) => {
        if (p.id === id && p.autoFixable && p.autoFixValue && p.fieldKey) {
          target = p;
          return { ...p, status: 'fixed' as const };
        }
        return p;
      });
      if (target && target.fieldKey && target.autoFixValue !== undefined) {
        const fieldKey = target.fieldKey;
        const before = target.autoFixValue; // 用建议值查询原值（实际从 Registration 兜底）
        // 落库 pendingPrefills 与 prefillMeta
        setPendingPrefills((pp) => ({ ...pp, [fieldKey]: target!.autoFixValue! }));
        setPrefillMeta((pm) => ({
          ...pm,
          [fieldKey]: {
            fieldKey,
            confidence: 0.95,
            source: 'Agent 自动纠错',
            acknowledged: false,
            beforeValue: before,
            afterValue: target!.autoFixValue!,
            fixReason: target!.reason,
          },
        }));
      }
      return next;
    });
  }, []);

  const rollbackAutoFix: SmartDraftCtx['rollbackAutoFix'] = useCallback((id) => {
    setReviewProblemsState((prev) => {
      let target: ReviewProblem | undefined;
      const next = prev.map((p) => {
        if (p.id === id) {
          target = p;
          return { ...p, status: 'open' as const };
        }
        return p;
      });
      if (target && target.fieldKey) {
        // 回退：把 prefillMeta 里 beforeValue 回写 → 再让 Registration 通过 useEffect 同步
        setPrefillMeta((pm) => {
          const m = pm[target!.fieldKey!];
          if (!m) return pm;
          return {
            ...pm,
            [target!.fieldKey!]: {
              ...m,
              afterValue: m.beforeValue,
              acknowledged: false,
            },
          };
        });
        setPendingPrefills((pp) => {
          const m = (pp as any)[target!.fieldKey!];
          const before = (window as any).__agentReviewRollback?.[target!.fieldKey!];
          if (before === undefined) return pp;
          return { ...pp, [target!.fieldKey!]: String(before) };
        });
      }
      return next;
    });
  }, []);

  // §3.2 审查摘要（open 状态的计数）
  const reviewSummary: ReviewSummary = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    let infos = 0;
    let totalOpen = 0;
    reviewProblems.forEach((p) => {
      if (p.status !== 'open') return;
      totalOpen += 1;
      if (p.severity === 'error') errors += 1;
      else if (p.severity === 'warning') warnings += 1;
      else infos += 1;
    });
    return { totalOpen, errors, warnings, infos };
  }, [reviewProblems]);

  // ──────────────────────────────────────────────────────────────────
  // §3.3 智能化连通测试（PRD §3.3.1 / 3.3.2）
  //   - setConnSteps: 测试过程呈现（DNS 解析 → 建连 → 认证 → 请求 → 返回）
  //   - setConnDiagnostics: 失败诊断 + 解决步骤
  //   - setHistoricalPlans / saveHistoricalPlan: 历史方案知识库（脱敏）
  // ──────────────────────────────────────────────────────────────────
  const setConnSteps: SmartDraftCtx['setConnSteps'] = useCallback((s) => {
    setConnStepsState(s);
  }, []);

  const setConnDiagnostics: SmartDraftCtx['setConnDiagnostics'] = useCallback((d) => {
    setConnDiagnosticsState(d);
  }, []);

  const setHistoricalPlans: SmartDraftCtx['setHistoricalPlans'] = useCallback((p) => {
    setHistoricalPlansState(p);
  }, []);

  // 历史方案知识库初始化（演示种子）
  useState(() => {
    if (historicalPlans.length === 0) {
      setHistoricalPlansState([
        {
          id: 'hp-1',
          agentName: '心电智能分析助手 v1.x',
          mode: 'API',
          endpointPattern: '/api/v1/agent/chat',
          symptom: '接口超时（504）',
          fix: '将请求超时从 5s 调整到 30s，并启用长连接复用',
          matchScore: 0.91,
        },
        {
          id: 'hp-2',
          agentName: '影像辅助阅片系统 v2.0',
          mode: 'API',
          endpointPattern: '/infer/image',
          symptom: '认证失败（401）',
          fix: '在请求头添加 X-Api-Key，并确认密钥已通过平台签发',
          matchScore: 0.84,
        },
        {
          id: 'hp-3',
          agentName: '门诊预问诊智能体',
          mode: 'API',
          endpointPattern: '/api/triage',
          symptom: '参数不符（400）',
          fix: '在 body 增加 patient 字段，类型为 object；移除冗余 token',
          matchScore: 0.78,
        },
      ]);
    }
    return null;
  });

  const saveHistoricalPlan: SmartDraftCtx['saveHistoricalPlan'] = useCallback((plan) => {
    setHistoricalPlansState((prev) => {
      const id = `hp-${Date.now()}`;
      return [{ ...plan, id }, ...prev].slice(0, 12);
    });
  }, []);

  /**
   * §3.3.2 历史方案复用气泡：把若干条 HistoricalPlan 推入对话窗口。
   * 同一 source 仅保留最新一条（替换既有），不堆叠。
   * - source='test-fail'   : 测试失败时，按错误码匹配推荐
   * - source='test-pass'   : 测试通过时，给一组「可参考的相似配置」做知识库曝光
   * - source='page-init'   : 进入新建注册页时主动推荐 Top3，让用户在还没测试前就能复用
   */
  const pushHistoricalPlans: SmartDraftCtx['pushHistoricalPlans'] = useCallback(
    (plans, source) => {
      const tag = `__historical_plan__:${source}`;
      if (!plans || plans.length === 0) {
        // 推空时把已有同 source 消息清除, 避免留下已无方案的卡片
        setMessages((prev) => prev.filter((m) => !m.id.startsWith(tag)));
        return;
      }
      const introMap: Record<typeof source, string> = {
        'test-fail': '按匹配度为你推荐以下历史成功方案，可一键复用：',
        'test-pass': '本条配置已通过，以下是同接入方式的相似历史配置供参考：',
        'page-init': '以下是基于关键词匹配的历史成功方案，可点开直接复用：',
      };
      const newMsg: AgentMessage = {
        id: `${tag}-${Date.now()}`,
        role: 'agent',
        type: 'historical-plan',
        content: introMap[source],
        timestamp: formatNow(),
        payload: {
          historicalPlans: plans,
          historicalPlanSource: source,
        },
      };
      setMessages((prev) => {
        // 替换或追加：先去掉同 source 的旧消息
        const filtered = prev.filter((m) => !m.id.startsWith(tag));
        return [...filtered, newMsg];
      });
    },
    [],
  );

  // ──────────────────────────────────────────────────────────────────
  // §3.4 接入结果洞察与汇报（PRD §3.4.1.1 - 3.4.1.3）
  //   - insightProgress: 当前聚焦的接入记录（用于进度气泡 + 详情页 progress）
  // ──────────────────────────────────────────────────────────────────
  const setInsightProgress: SmartDraftCtx['setInsightProgress'] = useCallback((p) => {
    setInsightProgressState(p);
  }, []);

  // §3.1.1 Agent 对话窗口上传 → 备案材料 bridge
  // - 单一 buffer：Registration 监听后 append 到 fileList，调 clearUploadedFile 置空
  // - 同 uid 替换而非追加，避免 React StrictMode 双跑导致重复入列
  const syncUploadedFile: SmartDraftCtx['syncUploadedFile'] = useCallback((file) => {
    setPendingUploadedFile(file);
  }, []);
  const clearUploadedFile: SmartDraftCtx['clearUploadedFile'] = useCallback(() => {
    setPendingUploadedFile(null);
  }, []);

  const value = useMemo<SmartDraftCtx>(
    () => ({
      messages,
      addMessage,
      addTaggedMessage,
      appendToLastAgent,
      clearMessages,
      removeMessagesByTag,
      pendingPrefills,
      prefillMeta,
      applyPrefill,
      acknowledgePrefill,
      clearPrefill,
      pendingFixes,
      addFixSuggestion,
      applyFix,
      dismissFix,
      activeWelcome,
      pushWelcomeGreeting,
      consumeWelcome,
      setWelcomePreviewProblems,
      reviewProblems,
      reviewSummary,
      setReviewProblems,
      ignoreProblem,
      confirmProblem,
      applyAutoFix,
      rollbackAutoFix,
      connSteps,
      setConnSteps,
      connDiagnostics,
      setConnDiagnostics,
      historicalPlans,
      setHistoricalPlans,
      saveHistoricalPlan,
      pushHistoricalPlans,
      insightProgress,
      setInsightProgress,
      pendingUploadedFile,
      syncUploadedFile,
      clearUploadedFile,
    }),
    [
      messages,
      addMessage,
      addTaggedMessage,
      appendToLastAgent,
      clearMessages,
      removeMessagesByTag,
      pendingPrefills,
      prefillMeta,
      applyPrefill,
      acknowledgePrefill,
      clearPrefill,
      pendingFixes,
      addFixSuggestion,
      applyFix,
      dismissFix,
      activeWelcome,
      pushWelcomeGreeting,
      consumeWelcome,
      setWelcomePreviewProblems,
      reviewProblems,
      reviewSummary,
      setReviewProblems,
      ignoreProblem,
      confirmProblem,
      applyAutoFix,
      rollbackAutoFix,
      connSteps,
      setConnSteps,
      connDiagnostics,
      setConnDiagnostics,
      historicalPlans,
      setHistoricalPlans,
      saveHistoricalPlan,
      pushHistoricalPlans,
      insightProgress,
      setInsightProgress,
      pendingUploadedFile,
      syncUploadedFile,
      clearUploadedFile,
    ],
  );

  // 测试期 dev hook: 把 store action 暴露到 window.__smartDraft, 方便 e2e 直接调
  // 仅在 import.meta.env.DEV 为 true 时挂载, 生产构建自动剔除
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!(import.meta as any).env?.DEV) return;
    (window as any).__smartDraft = {
      addMessage,
      pushWelcomeGreeting,
      pushHistoricalPlans,
      syncUploadedFile,
    };
    return () => {
      delete (window as any).__smartDraft;
    };
  }, [addMessage, pushWelcomeGreeting, pushHistoricalPlans, syncUploadedFile]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useSmartDraft = (): SmartDraftCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useSmartDraft must be used within <SmartDraftProvider>');
  }
  return ctx;
};

// ──────────────────────────────────────────────────────────────────────
// 工具
// ──────────────────────────────────────────────────────────────────────

const formatNow = () => {
  const d = new Date();
  const pad = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};