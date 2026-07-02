/**
 * §3.1.1 Agent 对话浮层
 *
 * 全局右下角悬浮入口 + 对话浮层
 *  - 入口：64x64px 立体小机器人 (AgentRobotIcon)
 *  - 浮层：从右下角展开 400x600px 对话窗口
 *  - 内容：标题栏 + 消息区 + 输入栏
 *  - Z-Index 1001，避免被页面内容遮挡
 *
 * 多模态上传 (P1.2)：
 *  - 文件 (PDF)
 *  - 图片 (jpg/png)
 *  - 链接 (粘贴 URL 自动识别)
 *  - 文本 (回车发送)
 *  - 语音 (前端 mock 转写)
 */
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Input,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  AudioOutlined,
  CloseOutlined,
  CloudUploadOutlined,
  LinkOutlined,
  PaperClipOutlined,
  SendOutlined,
  ThunderboltOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import RobotIcon from './AgentRobotIcon';
import AgentMessageBubble from './AgentMessageBubble';
import { useSmartDraft } from './store.tsx';
import type { AgentMood } from './types';

const { Text } = Typography;
const { TextArea } = Input;

// ──────────────────────────────────────────────────────────────────────
// 多模态「识别」模拟函数 —— 实际生产环境应替换为后端接口
// ──────────────────────────────────────────────────────────────────────

interface RecognizeResult {
  fields: Array<{ fieldKey: string; value: string; confidence: number; source: string }>;
  summary: string;
}

const recognizeFile = async (fileName: string): Promise<RecognizeResult> => {
  // 模拟「正在识别」的延迟
  await new Promise((r) => setTimeout(r, 1500));
  // 通用 PDF 识别模板：覆盖 PRD §3.1.2.2/2.3 必填字段，不再依赖文件名启发式
  // 仅当文件名含「技术规格|API」关键词时额外补充技术信息字段
  const isTechSpec = /技术规格|API|接口|SDK|OTel/i.test(fileName);
  const baseFields: RecognizeResult['fields'] = [
    { fieldKey: 'name', value: '智能辅助诊断系统', confidence: 0.96, source: `${fileName} §1.1` },
    { fieldKey: 'version', value: '2.1', confidence: 0.93, source: `${fileName} §1.3` },
    { fieldKey: 'department', value: '心内科', confidence: 0.88, source: `${fileName} §1.4 语义联动` },
    { fieldKey: 'clinicalStage', value: '辅助诊断', confidence: 0.82, source: `${fileName} §1.4 语义联动` },
    { fieldKey: 'source', value: '第三方', confidence: 0.85, source: `${fileName} §1.5` },
    { fieldKey: 'supplier', value: '北京医云科技有限公司', confidence: 0.92, source: `${fileName} §2.1` },
    { fieldKey: 'contactName', value: '陈志远', confidence: 0.9, source: `${fileName} §2.2` },
    { fieldKey: 'contactPhone', value: '13800138001', confidence: 0.86, source: `${fileName} §2.2` },
    { fieldKey: 'description', value: '面向门诊心电图检查的智能辅助诊断，自动识别 ST 段抬高、室性早搏等异常，输出结构化报告', confidence: 0.91, source: `${fileName} §3.1` },
  ];
  if (isTechSpec) {
    baseFields.push(
      { fieldKey: 'accessMode', value: 'API', confidence: 0.92, source: `${fileName} §4.1` },
      { fieldKey: 'apiEndpoint', value: 'http://10.10.10.20:8080/chat', confidence: 0.9, source: `${fileName} §4.2` },
      { fieldKey: 'apiKey', value: 'ak-8f9a****-3f9a', confidence: 0.65, source: `${fileName} §4.3` },
    );
  }
  return {
    fields: baseFields,
    summary: isTechSpec
      ? `已从「${fileName}」中识别 ${baseFields.length} 个字段（含 ${baseFields.length - 9} 个技术信息，API key 置信度偏低请确认），可一键采纳。`
      : `已从「${fileName}」中识别 ${baseFields.length} 个字段，可一键采纳到表单。`,
  };
};

const recognizeImage = async (fileName: string): Promise<RecognizeResult> => {
  await new Promise((r) => setTimeout(r, 1200));
  return {
    fields: [
      { fieldKey: 'name', value: 'OCR 识别：影像分析助手', confidence: 0.78, source: `${fileName}` },
      { fieldKey: 'contactPhone', value: '13900139002', confidence: 0.6, source: `${fileName}` },
    ],
    summary: `已对图片「${fileName}」完成 OCR 识别，置信度较低，建议核对。`,
  };
};

const recognizeLink = async (url: string): Promise<RecognizeResult> => {
  await new Promise((r) => setTimeout(r, 1500));
  return {
    fields: [
      { fieldKey: 'name', value: '链取引擎：在线问诊智能体', confidence: 0.74, source: url },
      { fieldKey: 'version', value: '1.5', confidence: 0.7, source: url },
      { fieldKey: 'description', value: '面向在线问诊场景的智能体，提供症状采集与初步分诊', confidence: 0.68, source: url },
    ],
    summary: `已抓取链接内容，识别 3 个字段（置信度偏低）。`,
  };
};

const recognizeText = async (text: string): Promise<RecognizeResult> => {
  await new Promise((r) => setTimeout(r, 800));
  // 简单关键词推断
  const fields: RecognizeResult['fields'] = [];
  if (/诊断|读片|影像/.test(text)) {
    fields.push({ fieldKey: 'description', value: text, confidence: 0.6, source: '用户文本' });
    fields.push({ fieldKey: 'clinicalStage', value: '辅助诊断', confidence: 0.7, source: '用户文本 语义联动' });
  } else if (/分诊|导诊/.test(text)) {
    fields.push({ fieldKey: 'description', value: text, confidence: 0.6, source: '用户文本' });
    fields.push({ fieldKey: 'clinicalStage', value: '导诊分诊', confidence: 0.72, source: '用户文本 语义联动' });
  } else {
    fields.push({ fieldKey: 'description', value: text, confidence: 0.55, source: '用户文本' });
  }
  return { fields, summary: '已根据您的描述推断部分字段，建议补充材料以提升置信度。' };
};

// ──────────────────────────────────────────────────────────────────────
// 主组件
// ──────────────────────────────────────────────────────────────────────

const CHAT_WIDTH = 440;
const CHAT_HEIGHT = 660;

// ──────────────────────────────────────────────────────────────────────
// PRD §3.1.1 「位置与拖拽」: 默认右下角, 支持鼠标按住机器人拖拽到任意
// 位置, 松开即停靠并记忆位置 (浏览器级 localStorage)
// ──────────────────────────────────────────────────────────────────────

type FloatPos = { left: number; top: number };

const POS_STORAGE_KEY = 'agent_assistant_pos_v1';
const ENTRY_SIZE = 64; // 折叠态入口边长
const VIEWPORT_MARGIN = 8; // 距视口边界的最小留白

const getDefaultPos = (): FloatPos => {
  if (typeof window === 'undefined') {
    return { left: 0, top: 0 };
  }
  return {
    left: Math.max(0, window.innerWidth - ENTRY_SIZE - 24),
    top: Math.max(0, window.innerHeight - ENTRY_SIZE - 24),
  };
};

const clampPos = (pos: FloatPos, size: number): FloatPos => {
  if (typeof window === 'undefined') return pos;
  const maxLeft = Math.max(0, window.innerWidth - size - VIEWPORT_MARGIN);
  const maxTop = Math.max(0, window.innerHeight - size - VIEWPORT_MARGIN);
  return {
    left: Math.min(Math.max(VIEWPORT_MARGIN, pos.left), maxLeft),
    top: Math.min(Math.max(VIEWPORT_MARGIN, pos.top), maxTop),
  };
};

const loadPos = (): FloatPos | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(POS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FloatPos>;
    if (typeof parsed.left !== 'number' || typeof parsed.top !== 'number') return null;
    if (!Number.isFinite(parsed.left) || !Number.isFinite(parsed.top)) return null;
    return { left: parsed.left, top: parsed.top };
  } catch {
    return null;
  }
};

const savePos = (pos: FloatPos) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* quota / privacy mode — 静默忽略 */
  }
};

const AgentAssistant = () => {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<AgentMood>('idle');
  const [hover, setHover] = useState(false);
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0); // 浮层收起时新消息未读数（>0 时红点显示数字）
  const [draggingFile, setDraggingFile] = useState(false); // 拖拽文件至对话窗口任意区域
  // §3.1.1 指向性规则：列表页气泡「迷你清单」展开态；按 activeWelcome.at 归零(切 Tab 重置)
  const [miniExpandedAt, setMiniExpandedAt] = useState<number | null>(null);

  // PRD §3.1.1 「位置与拖拽」
  const [pos, setPos] = useState<FloatPos>(() => {
    const stored = loadPos();
    return stored ? clampPos(stored, ENTRY_SIZE) : getDefaultPos();
  });
  const [draggingFloat, setDraggingFloat] = useState(false);
  const dragMovedRef = useRef(false); // 区分「拖动」与「点击」, 拖动时屏蔽 click 唤起
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(
    null,
  );
  const entryRef = useRef<HTMLDivElement>(null);

  const msgEndRef = useRef<HTMLDivElement>(null);
  const dragCounter = useRef(0);
  const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // §3.1.1 新建注册页气泡「上传材料」→ 触发隐藏文件输入
  const hiddenUploadRef = useRef<HTMLInputElement>(null);
  // 用户是否曾打开过浮层 — 在此之前的初始消息 / 欢迎语都不计入未读
  const hasOpenedRef = useRef(false);

  const {
    messages,
    addMessage,
    appendToLastAgent,
    applyPrefill,
    acknowledgePrefill,
    prefillMeta,
    activeWelcome,
    pushWelcomeGreeting,
    consumeWelcome,
    historicalPlans,
    syncUploadedFile,
  } = useSmartDraft();

  // 滚动到底部
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 浮层打开时: 标记已阅 + 清零未读数; 仅在用户**真正打开过**后才开始累计未读
  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      setUnreadCount(0);
    }
  }, [open]);

  // 监听消息数变化: 浮层关闭时累加未读条数, 浮层打开时只刷新 baseline
  // 仅在用户曾经打开过浮层后, 新增的 agent 消息才计为未读
  const lastCount = useRef(messages.length);
  useEffect(() => {
    if (!open && messages.length > lastCount.current) {
      if (hasOpenedRef.current) {
        // 仅累加 agent (assistant) 侧的新消息, 排除用户自己的输入
        const newAgentMsgs = messages.slice(lastCount.current).filter((m) => m.role === 'agent');
        if (newAgentMsgs.length > 0) {
          setUnreadCount((c) => c + newAgentMsgs.length);
        }
      }
      // 触发 bounce 动画
      setMood('happy');
      const t = setTimeout(() => setMood('idle'), 1200);
      return () => clearTimeout(t);
    }
    lastCount.current = messages.length;
    return undefined;
  }, [messages.length, open, messages]);

  // PRD §3.1.1 欢迎语：当前激活的 page-level 欢迎气泡
  //   - 进入 smart-register 等页面, pushWelcomeGreeting 写入 store.activeWelcome
  //   - 在 robot 旁 110px 显示气泡, 自动 8s 后收起 (用户点击或操作可立即消费)
  //   - 浮层打开时,气泡不重复显示 (浮层内已有相同文案)
  useEffect(() => {
    if (!activeWelcome) return;
    if (open) return; // 浮层已开, 机器人旁气泡不重复
    welcomeTimerRef.current = setTimeout(() => {
      consumeWelcome();
    }, 8000);
    return () => {
      if (welcomeTimerRef.current) {
        clearTimeout(welcomeTimerRef.current);
        welcomeTimerRef.current = null;
      }
    };
  }, [activeWelcome, open, consumeWelcome]);

  // 进入页面主动问候 (Demo 效果): 组件挂载即推一条通用欢迎
  // 真正的页面级欢迎语由 SmartRegistrationForm 在挂载时调 pushWelcomeGreeting
  useEffect(() => {
    // 仅在初始化时推一次 (与 store 内的初始消息并存, 不重复)
    // 这里留空也可,因为智能填写页会在 mount 时主动调
  }, []);

  // §3.2.1 监听气泡内紧凑版 adopt/ignore 按钮触发的 CustomEvent
  //   - 写 window.__preAuditIssueStatus[id] 让 ChatPanel 内的 pre-audit-issue 同步灰态
  //   - 同时 setLocalStatus 用 React state 让气泡自身的卡片立即重渲染(否则只读 window 不触发刷新)
  //   - 与 Audit.tsx 的处理对称; smart-register 页没有其他 listener 帮 setStatus, 这里补上
  const [bubbleStatusMap, setBubbleStatusMap] = useState<Record<string, 'adopted' | 'ignored'>>({});
  useEffect(() => {
    const onAdopt = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!id) return;
      (window as any).__preAuditIssueStatus = (window as any).__preAuditIssueStatus || {};
      (window as any).__preAuditIssueStatus[id] = 'adopted';
      setBubbleStatusMap((prev) => ({ ...prev, [id]: 'adopted' }));
    };
    const onIgnore = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!id) return;
      (window as any).__preAuditIssueStatus = (window as any).__preAuditIssueStatus || {};
      (window as any).__preAuditIssueStatus[id] = 'ignored';
      setBubbleStatusMap((prev) => ({ ...prev, [id]: 'ignored' }));
    };
    // 复用 chat panel 派发的同一组事件名; 仅当 ChatPanel 未挂载或本组件自身的气泡在派发时
    // (chat panel / bubble 是同一个 window, 故本地派发也会被自身监听到 — 这是预期行为,
    //  仅"外部页面无 consumer"时也保证窗口状态被驱动)
    window.addEventListener('agent-issue-adopt', onAdopt);
    window.addEventListener('agent-issue-ignore', onIgnore);
    return () => {
      window.removeEventListener('agent-issue-adopt', onAdopt);
      window.removeEventListener('agent-issue-ignore', onIgnore);
    };
  }, []);

  // ─── PRD §3.1.1 「位置与拖拽」: 视口变化时 clamp 位置 + 持久化 ───
  // - 对话浮层已与入口位置解耦 (固定 right/bottom 24), 因此只按 ENTRY_SIZE clamp
  useEffect(() => {
    const onResize = () => {
      setPos((p) => {
        const next = clampPos(p, ENTRY_SIZE);
        if (next.left !== p.left || next.top !== p.top) {
          savePos(next);
        }
        return next;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ─── PRD §3.1.1 「位置与拖拽」: 鼠标按住机器人拖拽, 松开停靠 ───
  // - mousedown 落在 entryRef 子树即启动; 拖拽过程中不触发 click 唤起
  // - mousemove/mouseup 挂 window 避免 React StrictMode 双跑留幽灵监听
  useEffect(() => {
    const handle = entryRef.current;
    if (!handle) return undefined;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // 仅左键
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        posX: pos.left,
        posY: pos.top,
      };
      dragMovedRef.current = false;
      // 阻止后续 click 触发唤起: 拖动超过阈值才置 true, mouseup 据此 stopPropagation
      // 简单实现: 鼠标按下时用 capture 拦截 click
      const onClickCapture = (ev: MouseEvent) => {
        if (dragMovedRef.current) {
          ev.stopPropagation();
          ev.preventDefault();
        }
        handle.removeEventListener('click', onClickCapture, true);
      };
      handle.addEventListener('click', onClickCapture, true);
    };

    const onMouseMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.mouseX;
      const dy = e.clientY - start.mouseY;
      if (!dragMovedRef.current && Math.hypot(dx, dy) < 3) return; // 防抖: < 3px 视为点击
      dragMovedRef.current = true;
      // 对话浮层固定在视口右下角, 与入口位置解耦, 因此拖动 clamp 只按 ENTRY_SIZE
      const next = clampPos(
        { left: start.posX + dx, top: start.posY + dy },
        ENTRY_SIZE,
      );
      setPos(next);
      setDraggingFloat(true);
    };

    const onMouseUp = () => {
      if (!dragStartRef.current) return;
      const start = dragStartRef.current;
      dragStartRef.current = null;
      // 拖动过才落库 + 视觉态复位
      if (dragMovedRef.current) {
        // 异步读最新 pos 写盘, 避免闭包旧值
        setPos((latest) => {
          savePos(latest);
          return latest;
        });
        setDraggingFloat(false);
      } else {
        // 纯点击: 让 click 正常走到 onClick（唤起浮层）
        setDraggingFloat(false);
      }
      // 静默使用 start, 防止 lint 警告; 真实消费在 setPos 回调中
      void start;
    };

    handle.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [open, pos.left, pos.top]);

  // ─── 输入发送 ───
  const sendText = () => {
    const text = input.trim();
    if (!text) return;
    addMessage({ role: 'user', type: 'text', content: text });
    setInput('');
    runRecognitionFlow(() => recognizeText(text));
  };

  // ─── PRD §3.1.1 拖拽上传至对话窗口任意区域 ───
  // 利用 window 计数法穿透 antd 组件, 兼容单页多面板场景
  useEffect(() => {
    const onWindowDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      dragCounter.current += 1;
      setDraggingFile(true);
    };
    const onWindowDragLeave = (e: DragEvent) => {
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) setDraggingFile(false);
    };
    const onWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setDraggingFile(false);
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      // 仅在浮层打开时拦截拖拽至对话窗口
      if (!open) return;
      const file = files[0] as unknown as UploadFile;
      handleUpload(file);
    };
    const onWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    };
    window.addEventListener('dragenter', onWindowDragEnter);
    window.addEventListener('dragleave', onWindowDragLeave);
    window.addEventListener('drop', onWindowDrop);
    window.addEventListener('dragover', onWindowDragOver);
    return () => {
      window.removeEventListener('dragenter', onWindowDragEnter);
      window.removeEventListener('dragleave', onWindowDragLeave);
      window.removeEventListener('drop', onWindowDrop);
      window.removeEventListener('dragover', onWindowDragOver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ─── 统一识别流程：先推「detecting」消息，再推「识别结果」 ───
  const runRecognitionFlow = async (
    fetcher: () => Promise<RecognizeResult>,
    extra?: { fileName?: string; fileSize?: number; label?: string },
  ) => {
    setMood('thinking');
    addMessage({
      role: 'agent',
      type: 'detecting',
      content: extra?.label ?? '正在识别…',
      payload: extra ? { fileName: extra.fileName, fileSize: extra.fileSize } : undefined,
    });
    try {
      const result = await fetcher();
      // 替换上条「detecting」为「识别结果」
      appendToLastAgent({
        type: extra?.fileName
          ? /pdf/i.test(extra.fileName)
            ? 'file-detect'
            : 'image-detect'
          : 'prefill',
        content: result.summary,
        payload: {
          ...(extra?.fileName ? { fileName: extra.fileName } : {}),
          ...(extra?.fileSize ? { fileSize: extra.fileSize } : {}),
          detectedFields: result.fields,
        },
      });
      // 写入 store
      applyPrefill(result.fields);
      setMood('happy');
      setTimeout(() => setMood('idle'), 1200);
    } catch (e) {
      appendToLastAgent({
        type: 'error',
        content: '识别失败，请稍后重试。',
        payload: { errorCode: 'RECOGNIZE_FAIL' },
      });
      setMood('sad');
      setTimeout(() => setMood('idle'), 1500);
    }
  };

  // ─── 上传文件 / 图片 ───
  const handleUpload = async (file: UploadFile) => {
    const isPdf = file.name?.toLowerCase().endsWith('.pdf');
    const size = file.size ?? 0;
    if (size > 30 * 1024 * 1024) {
      message.error('上传失败，单文件超过最大限制 30M');
      return false;
    }
    addMessage({
      role: 'user',
      type: 'text',
      content: isPdf ? `上传文件：${file.name}` : `上传图片：${file.name}`,
      payload: { fileName: file.name, fileSize: size },
    });
    // §3.1.1 同步到「备案材料」列表：仅 PDF（图片仅用于 OCR 识别，不入备案材料）。
    // 同 uid 走 store 内部去重，避免重复入列。
    if (isPdf) {
      const uid = (file.uid as string) || `agent-up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      syncUploadedFile({ uid, name: file.name, size, type: file.type });
    }
    runRecognitionFlow(() => (isPdf ? recognizeFile(file.name) : recognizeImage(file.name)), {
      fileName: file.name,
      fileSize: size,
      label: isPdf ? `正在解析 ${file.name}…` : `正在 OCR 识别 ${file.name}…`,
    });
    return false; // 阻止 antd 默认上传
  };

  // ─── 粘贴链接 ───
  const detectLinkInText = (text: string): string | null => {
    const m = text.match(/https?:\/\/[^\s]+/);
    return m ? m[0] : null;
  };

  const onInputChange = (v: string) => {
    setInput(v);
  };

  const handleSend = () => {
    const link = detectLinkInText(input);
    if (link) {
      addMessage({ role: 'user', type: 'text', content: `发送链接：${link}` });
      setInput('');
      runRecognitionFlow(() => recognizeLink(link), { label: '正在抓取链接内容…' });
      return;
    }
    sendText();
  };

  // ─── 语音 (mock) ───
  const toggleVoice = () => {
    if (recording) {
      setRecording(false);
      const mockTranscript = '我需要接入一个智能导诊助手';
      addMessage({ role: 'user', type: 'text', content: `[语音转写] ${mockTranscript}` });
      runRecognitionFlow(() => recognizeText(mockTranscript), { label: '正在识别语音…' });
      return;
    }
    setRecording(true);
    setMood('thinking');
    message.info('开始录音…再次点击结束');
  };

  // §3.1.1 新建注册页气泡直接操作：【上传材料】打开浮层并触发文件选择；【语音描述】打开浮层并开始录音
  useEffect(() => {
    const onTriggerUpload = () => {
      setOpen(true);
      // 等浮层渲染后再触发隐藏 input 的文件选择
      setTimeout(() => hiddenUploadRef.current?.click(), 60);
    };
    const onTriggerVoice = () => {
      setOpen(true);
      if (!recording) toggleVoice();
    };
    window.addEventListener('agent-register-trigger-upload', onTriggerUpload);
    window.addEventListener('agent-register-trigger-voice', onTriggerVoice);
    return () => {
      window.removeEventListener('agent-register-trigger-upload', onTriggerUpload);
      window.removeEventListener('agent-register-trigger-voice', onTriggerVoice);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  // ─── 批量采纳: file-detect / image-detect / link-detect 气泡的「确认采纳 (N)」入口
  // - 取代旧的「全部采纳」: 取消高置信度自动采纳, 改为用户逐项勾选后批量采纳
  // - 与 PRD §3.2.1 智能预审 / 智能审查「勾选 + 确认采纳」交互同构
  const ackBatch = (fieldKeys: string[]) => {
    const n = fieldKeys.length;
    fieldKeys.forEach((k) => acknowledgePrefill(k));
    if (n > 0) {
      message.success(`已采纳 ${n} 个 AI 预填字段到表单，可继续核对修改`);
    }
    addMessage({
      role: 'agent',
      type: 'autofix-done',
      content: n > 0
        ? `已采纳 ${n} 个 AI 预填字段到下方表单（绿色对勾将在 5s 后消失），请继续核对或修改。`
        : '当前没有待采纳的 AI 预填字段。',
    });
  };

  const ackField = (k: string) => {
    acknowledgePrefill(k);
  };

  // 当前 mood 注入 hover 变体
  const effectiveMood: AgentMood = hover && !open ? 'hover' : mood;

  return (
    <>
      {/* §3.1.1 隐藏文件输入：新建注册页气泡「上传材料」触发 */}
      <input
        ref={hiddenUploadRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f as unknown as UploadFile);
          e.target.value = '';
        }}
      />
      {/* 机器人旁 page-level 欢迎气泡 (§3.1.1 表格：进入页面 + 浮层未打开时展示)
          §4.1.1 管理员总览：文字汇报 + 可点状态 chip + 一键直达（按权限置灰） */}
      {!open && activeWelcome && (
        <div
          className="agent-welcome-bubble"
          data-testid="status-bubble"
          // PRD §3.1.1: 气泡需紧跟机器人, 拖到哪里气泡跟到哪里
          //   - 默认入口在右下角 → 气泡出现在入口的左上方 (right: 110 / bottom: 28 视觉一致)
          //   - 入口被拖到左半屏 → 气泡改放到入口的右上方, 避免溢出视口
          // V2.1 改造:
          //   - 短内容场景: maxHeight 去掉, 让气泡完全贴内容 (高度由 padding+子元素自然决定)
          //   - 有 chip / miniList / 多个 action 时 (即下方中段 div 被渲染): 仍保留 280px 上限 + 内部滚动
          //   - 修复 fixed top+bottom 同时设被拉伸: inline style 显式 bottom: auto / right: auto,
          //     避免 CSS 的兜底 right:110 / bottom:28 把气泡撑到 viewport - top - bottom
          style={{
            ...(pos.left > (typeof window !== 'undefined' ? window.innerWidth : 1440) - 240
              ? // 入口在右半屏: 气泡在左上方
                { left: Math.max(8, pos.left - 360), top: Math.max(8, pos.top - 90) }
              : // 入口在左半屏: 气泡在右上方
                { left: pos.left + ENTRY_SIZE + 12, top: Math.max(8, pos.top - 90) }),
            bottom: 'auto',
            right: 'auto',
            maxHeight:
              ((activeWelcome.chips && activeWelcome.chips.length > 0) ||
              (activeWelcome.actions && activeWelcome.actions.length > 0) ||
              (activeWelcome.miniList && activeWelcome.miniList.rows.length > 0) ||
              (activeWelcome.previewProblems && activeWelcome.previewProblems.items.length > 0))
                ? 'min(280px, calc(100vh - 32px))'
                : 'none',
            maxWidth: 360,
            padding: '10px 12px',
            lineHeight: 1.5,
            fontSize: 12,
            overflow: 'hidden',
            // V2.1 改造: width:fit-content + max-width:360 + inline-flex
            //   - 短内容场景(<360): 气泡贴内容自然撑开, 不留右侧大块空白
            //   - 长内容场景(>=360): 触发 max-width, 文字自然换行不被截断
            //   - 配合全局 CSS 已去掉 min-width:280px, 真正做到「内容决定宽度」
            display: 'inline-flex',
            flexDirection: 'column',
            width: 'fit-content',
          }}
          onClick={() => {
            // §4.1.1 文字汇报：点气泡展开对话窗口深入交流（不强制）
            setOpen(true);
            consumeWelcome();
          }}
          role="dialog"
          aria-label="医小管态势汇报"
        >
          <button
            type="button"
            className="agent-welcome-bubble-close"
            aria-label="关闭气泡"
            onClick={(e) => {
              e.stopPropagation();
              consumeWelcome();
            }}
          >
            ×
          </button>
          <strong style={{ color: '#1677FF', fontSize: 13 }}>医小管</strong>
          <span
            style={{ marginLeft: 4, display: 'inline-block', marginTop: 4 }}
            data-testid="status-bubble-content"
          >
            {activeWelcome.content}
          </span>
          {/* 中段内容区: chip / actions / miniList 在气泡高度超限时可滚动,
              标题行 + 底部状态保持固定可见
              V2.1 改造: 仅在三个区段至少有一个时渲染此 div,
                简单文案场景不留空白占位(避免 flex:1 把气泡撑高 40~60px) */}
          {((activeWelcome.chips && activeWelcome.chips.length > 0) ||
            (activeWelcome.actions && activeWelcome.actions.length > 0) ||
            (activeWelcome.miniList && activeWelcome.miniList.rows.length > 0) ||
            (activeWelcome.previewProblems && activeWelcome.previewProblems.items.length > 0)) && (
          <div
            style={{
              marginTop: 6,
              // V2.1 改造: 仅在 maxHeight 受限时 (即内容可能溢出) 才用 flex:1 撑开滚动区,
              //   普通 chip/action/miniList 折叠态场景下走自然高度, 不留大块空白
              flex: '0 0 auto',
              minHeight: 0,
              maxHeight: 'none',
              overflowY: 'visible',
            }}
          >
          {/* §4.1.1 状态分流 chip：点击直接跳对应状态 tab */}
          {activeWelcome.chips && activeWelcome.chips.length > 0 && (
            <div
              style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}
              onClick={(e) => e.stopPropagation()}
            >
              {activeWelcome.chips.map((c) => (
                <Tag.CheckableTag
                  key={c.key}
                  data-testid={`status-bubble-chip-${c.key}`}
                  checked={c.tone === 'success'}
                  style={{
                    padding: '2px 8px',
                    border: `1px solid ${
                      c.tone === 'warning'
                        ? '#FAAD14'
                        : c.tone === 'success'
                          ? '#52C41A'
                          : c.tone === 'error'
                            ? '#FF4D4F'
                            : '#91D5FF'
                    }`,
                    background:
                      c.tone === 'warning'
                        ? '#FFFBE6'
                        : c.tone === 'success'
                          ? '#F6FFED'
                          : c.tone === 'error'
                            ? '#FFF1F0'
                            : '#E6F4FF',
                    color: '#1F1F1F',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    // 跳 tab：通过自定义事件通知 index.tsx 处理
                    window.dispatchEvent(
                      new CustomEvent('agent-jump-tab', { detail: c.targetTab }),
                    );
                    consumeWelcome();
                  }}
                >
                  {c.label}
                </Tag.CheckableTag>
              ))}
            </div>
          )}
          {/* §3.2.1 智能预审 · 紧凑版 — 与对话窗口内 pre-audit-issue 同一数据源同步展示
              - 前 3 条 + 底部「查看全部 (N)」(主操作入口是 click 打开对话窗口)
              - 每条问题自带 3 个 link 按钮(定位 / 采纳 / 忽略) → 通过既有 CustomEvent 派发,
                与 ChatPanel 内完整气泡共享同一套消费回路, 状态通过 window.__preAuditIssueStatus 同步 */}
          {activeWelcome.previewProblems && activeWelcome.previewProblems.items.length > 0 && (
            <div
              data-testid="status-bubble-preview-issues"
              style={{
                marginTop: 8,
                border: '1px solid #FFD591',
                background: '#FFFBE6',
                borderRadius: 6,
                padding: '6px 8px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#D48806',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                }}
              >
                <span>
                  <WarningOutlined style={{ marginRight: 4 }} />
                  智能预审 {activeWelcome.previewProblems.total} 项待处理
                </span>
              </div>
              {activeWelcome.previewProblems.items.map((p) => {
                // 优先读本组件 React state, 兜底读 window(支持 Audit 页派发的状态同步)
                const localStatus = bubbleStatusMap[p.id];
                const winStatus = (window as any).__preAuditIssueStatus?.[p.id];
                const adopted = localStatus === 'adopted' || winStatus === 'adopted';
                const ignored = localStatus === 'ignored' || winStatus === 'ignored';
                const tone =
                  p.severity === 'error'
                    ? { border: '#FFA39E', bg: '#FFF1F0', text: '#CF1322', dot: '#FF4D4F' }
                    : p.severity === 'warning'
                      ? { border: '#FFE58F', bg: '#FFFBE6', text: '#D48806', dot: '#FAAD14' }
                      : { border: '#91D5FF', bg: '#E6F4FF', text: '#1677FF', dot: '#1677FF' };
                return (
                  <div
                    key={p.id}
                    data-testid={`status-bubble-preview-issue-${p.id}`}
                    style={{
                      fontSize: 12,
                      color: '#1F1F1F',
                      marginTop: 4,
                      padding: '4px 6px',
                      borderRadius: 4,
                      background: adopted ? '#F6FFED' : ignored ? '#FAFAFA' : '#FFFFFF',
                      border: `1px solid ${adopted ? '#B7EB8F' : ignored ? '#D9D9D9' : tone.border}`,
                      opacity: ignored ? 0.6 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: tone.dot,
                          flex: '0 0 auto',
                        }}
                      />
                      <span
                        style={{
                          flex: 1,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.title}
                      </span>
                    </div>
                    {!adopted && !ignored && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                        {p.fieldKey && (
                          <Button
                            size="small"
                            type="link"
                            style={{ padding: 0, fontSize: 11 }}
                            data-testid={`status-bubble-preview-locate-${p.id}`}
                            onClick={() =>
                              window.dispatchEvent(
                                new CustomEvent('agent-review-locate-field', { detail: p.fieldKey }),
                              )
                            }
                          >
                            定位到字段
                          </Button>
                        )}
                        <Button
                          size="small"
                          type="link"
                          style={{ padding: 0, fontSize: 11 }}
                          data-testid={`status-bubble-preview-adopt-${p.id}`}
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent('agent-issue-adopt', { detail: p.id }),
                            )
                          }
                        >
                          采纳
                        </Button>
                        <Button
                          size="small"
                          type="link"
                          style={{ padding: 0, fontSize: 11 }}
                          data-testid={`status-bubble-preview-ignore-${p.id}`}
                          onClick={() =>
                            window.dispatchEvent(
                              new CustomEvent('agent-issue-ignore', { detail: p.id }),
                            )
                          }
                        >
                          忽略本条
                        </Button>
                      </div>
                    )}
                    {adopted && (
                      <div style={{ fontSize: 11, color: '#389E0D', marginTop: 2 }}>✓ 已采纳</div>
                    )}
                    {ignored && (
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>已忽略</div>
                    )}
                  </div>
                );
              })}
              {activeWelcome.previewProblems.total > activeWelcome.previewProblems.items.length && (
                <Button
                  type="link"
                  size="small"
                  block
                  data-testid="status-bubble-preview-footer"
                  onClick={() => {
                    // 打开对话窗口 + 消耗气泡
                    setOpen(true);
                    consumeWelcome();
                  }}
                  style={{ fontSize: 12, padding: '4px 0 0' }}
                >
                  查看全部 ({activeWelcome.previewProblems.total}) ›
                </Button>
              )}
            </div>
          )}
          {/* §4.1.1 一键直达：按权限置灰；非 admin 看不到「准入评测沙盒」或置灰 */}
          {activeWelcome.actions && activeWelcome.actions.length > 0 && (
            <div
              style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}
              onClick={(e) => e.stopPropagation()}
            >
              {activeWelcome.actions.map((a) => (
                <Tooltip key={a.key} title={a.enabled ? '' : (a.reason || '当前账号暂无该操作权限')}>
                  <Button
                    size="small"
                    type="link"
                    data-testid={`status-bubble-action-${a.key}`}
                    disabled={!a.enabled}
                    onClick={() => {
                      if (!a.enabled) return;
                      if (a.event) {
                        // 单记录页直接操作（上传 / 语音 / 审核结论 / 附件预览等）走页面内事件
                        window.dispatchEvent(new CustomEvent(a.event));
                      } else if (a.path) {
                        window.location.href = a.path;
                      }
                      consumeWelcome();
                    }}
                    style={{ padding: '0 6px' }}
                  >
                    {a.label}
                  </Button>
                </Tooltip>
              ))}
            </div>
          )}
          {/* §3.1.1 指向性规则（列表页多记录）：气泡按钮不直接操作单条，
              而是展开「迷你清单」— 每条自带记录级按钮 + 底部「查看全部」回到对应 Tab */}
          {activeWelcome.miniList && activeWelcome.miniList.rows.length > 0 && (
            <div
              style={{ marginTop: 8 }}
              onClick={(e) => e.stopPropagation()}
            >
              {miniExpandedAt !== activeWelcome.at ? (
                // 折叠态：单个引导按钮，点击展开清单
                <Button
                  size="small"
                  type="primary"
                  ghost
                  data-testid="status-bubble-mini-toggle"
                  onClick={() => setMiniExpandedAt(activeWelcome.at)}
                  style={{ padding: '0 10px' }}
                >
                  {activeWelcome.miniList.toggleLabel} ›
                </Button>
              ) : (
                // 展开态：前 3–5 条记录清单 + 每条记录级按钮 + 查看全部
                <div
                  data-testid="status-bubble-mini"
                  style={{
                    border: '1px solid #E8E8E8',
                    borderRadius: 8,
                    background: '#FFFFFF',
                    maxHeight: 160,
                    overflowY: 'auto',
                  }}
                >
                  {activeWelcome.miniList.rows.map((row) => (
                    <div
                      key={row.recordId}
                      data-testid={`status-bubble-mini-row-${row.recordId}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '6px 8px',
                        borderBottom: '1px solid #F5F5F5',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#1F1F1F',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.title}
                        </div>
                        {(row.subTitle || row.meta) && (
                          <div
                            style={{
                              fontSize: 11,
                              color: '#999',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {[row.subTitle, row.meta].filter(Boolean).join(' · ')}
                          </div>
                        )}
                      </div>
                      <Space size={0} wrap={false}>
                        {row.actions.map((act) => (
                          <Button
                            key={act.key}
                            size="small"
                            type="link"
                            danger={act.danger}
                            data-testid={`status-bubble-mini-action-${act.kind}-${row.recordId}`}
                            onClick={() => {
                              window.dispatchEvent(
                                new CustomEvent('agent-bubble-row-action', {
                                  detail: { kind: act.kind, recordId: row.recordId, path: act.path },
                                }),
                              );
                              consumeWelcome();
                            }}
                            style={{ padding: '0 6px', fontSize: 12 }}
                          >
                            {act.label}
                          </Button>
                        ))}
                      </Space>
                    </div>
                  ))}
                  {/* 底部「查看全部」回到对应 Tab */}
                  <Button
                    type="link"
                    size="small"
                    block
                    data-testid="status-bubble-mini-footer"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent('agent-jump-tab', {
                          detail: activeWelcome.miniList!.targetTab,
                        }),
                      );
                      consumeWelcome();
                    }}
                    style={{ fontSize: 12 }}
                  >
                    查看全部 ({activeWelcome.miniList.totalCount}) ›
                  </Button>
                </div>
              )}
            </div>
          )}
          </div>
          )}
        </div>
      )}

      {/* 悬浮入口 */}
      {!open && (
        <div
          ref={entryRef}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => {
            // 拖动产生的 click 已在 capture 阶段被拦截, 此处仅响应纯点击
            setOpen(true);
            // 唤起浮层时主动问候一次（医小管 通用开场白）
            // —— 真正的页面欢迎语已由 SmartRegistrationForm 推过, 这里仅补一次轻量问候
            setMood('happy');
            setTimeout(() => setMood('idle'), 600);
          }}
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            width: ENTRY_SIZE,
            height: ENTRY_SIZE,
            // PRD §3.1.1 拖拽过程中略降透明度, 跟随光标移动; 抓握光标
            opacity: draggingFloat ? 0.7 : 1,
            cursor: draggingFloat ? 'grabbing' : 'grab',
            userSelect: draggingFloat ? 'none' : 'auto',
            zIndex: 1001,
            transition: draggingFloat
              ? 'none'
              : 'transform 200ms ease-out, opacity 150ms ease-out',
            transform: hover && !draggingFloat ? 'translateY(-4px) scale(1.05)' : 'translateY(0) scale(1)',
          }}
          aria-label="唤起智能填写助手（医小管），可拖拽到任意位置"
          role="button"
        >
          <RobotIcon mood={effectiveMood} size={hover ? 72 : 64} badge={unreadCount > 0 ? unreadCount : false} />
          {/* 浮动小气泡提示 (hover 时显示文字) */}
          {hover && (
            <div
              style={{
                position: 'absolute',
                right: 80,
                top: 12,
                background: '#1F1F1F',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 12,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                pointerEvents: 'none',
              }}
            >
              医小管
              <div
                style={{
                  position: 'absolute',
                  right: -4,
                  top: 10,
                  width: 0,
                  height: 0,
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  borderLeft: '4px solid #1F1F1F',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 对话浮层 — 始终固定在视口右下角, 与机器人 icon 的拖拽位置解耦
          (机器人可拖到任意位置停靠, 但对话窗口保持右下角锚定) */}
      {open && (
        <div
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            width: CHAT_WIDTH,
            height: CHAT_HEIGHT,
            maxHeight: 'calc(100vh - 48px)',
            background: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            border: `1px solid ${draggingFile ? '#1677FF' : '#E8E8E8'}`,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1001,
            overflow: 'hidden',
            animation: 'agentChatPanelIn 250ms ease-out',
          }}
          className={draggingFile ? 'agent-chat-dropzone agent-chat-dropping' : undefined}
        >
          {/* 标题栏 */}
          <div
            style={{
              height: 48,
              padding: '0 12px 0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #F0F0F0',
              background: 'linear-gradient(90deg, #F0F8FF 0%, #FFFFFF 100%)',
            }}
          >
            <Space size={10}>
              <div style={{ width: 32, height: 32 }}>
                <RobotIcon mood="idle" size={32} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1F1F1F' }}>
                  医小管
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  接入全程陪伴 · 可随时呼出
                </Text>
              </div>
            </Space>
            <Tooltip title="收起对话（不清空会话）">
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => setOpen(false)}
              />
            </Tooltip>
          </div>

          {/* 拖拽高亮提示 (PRD §3.1.1:"拖入时窗口高亮并提示「松开即可上传」")
              边框仅由外层 .agent-chat-dropzone 提供(全局 CSS), 此处不再叠加内层虚线框 */}
          {draggingFile && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'rgba(22, 119, 255, 0.04)',
                color: '#1677FF',
                fontSize: 14,
                fontWeight: 500,
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              <CloudUploadOutlined style={{ fontSize: 22 }} />
              松开即可上传（单文件 ≤ 30M · 仅支持 PDF / 图片）
            </div>
          )}

          {/* 消息区 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              background: '#FAFAFA',
            }}
          >
            {messages.map((m) => (
              <AgentMessageBubble
                key={m.id}
                msg={m}
                onAcknowledge={ackField}
                onAcknowledgeFields={ackBatch}
                // §3.3.2 历史方案复用：点击「复用此方案」按 planId 命中后弹成功提示
                //   - 同时向 conversation 推一条 agent 反馈消息形成闭环
                //   - 当前 frontend 是 mock, 不实际改表单(避免误覆盖), 让用户照抄
                onReusePlan={(planId) => {
                  const plan = historicalPlans.find((p) => p.id === planId);
                  if (!plan) {
                    message.warning('未找到该方案，请刷新知识库');
                    return;
                  }
                  message.success(`已复用「${plan.agentName}」的成功配置到当前表单`);
                  addMessage({
                    role: 'agent',
                    type: 'autofix-done',
                    content: `已复用「${plan.agentName}」的成功配置（${plan.endpointPattern}），请在下方技术信息区继续核对修改。`,
                  });
                }}
                // §4.2.1 / §4.3.1 智能预审气泡回调：通过 window 自定义事件转发到具体审核页
                onIssueAdopt={(id) =>
                  window.dispatchEvent(new CustomEvent('agent-issue-adopt', { detail: id }))
                }
                onIssueIgnore={(id) =>
                  window.dispatchEvent(new CustomEvent('agent-issue-ignore', { detail: id }))
                }
                // §3.2.1 注册页实时审查：单条问题「定位到字段」走 window 事件
                onIssueLocate={(fieldKey) =>
                  window.dispatchEvent(
                    new CustomEvent('agent-review-locate-field', { detail: fieldKey }),
                  )
                }
                // §3.2.1 「帮我检查一下」按钮：注册页 re-run 实时审查
                onRequestReview={() =>
                  window.dispatchEvent(new CustomEvent('agent-review-rerun'))
                }
                onSeverityFilter={(s) =>
                  window.dispatchEvent(new CustomEvent('agent-severity-filter', { detail: s }))
                }
                severityFilter={(window as any).__agentSeverityFilter || 'all'}
              />
            ))}
            <div ref={msgEndRef} />
          </div>

          {/* 输入栏 */}
          <div
            style={{
              borderTop: '1px solid #F0F0F0',
              padding: 8,
              background: '#FFFFFF',
            }}
          >
            {recording && (
              <Alert
                type="warning"
                showIcon
                message="正在录音…再次点击 🎤 结束录音并自动转写"
                style={{ marginBottom: 8, fontSize: 12, padding: '4px 10px' }}
                banner
              />
            )}
            <Space.Compact style={{ width: '100%' }}>
              <Upload
                accept=".pdf,.png,.jpg,.jpeg"
                showUploadList={false}
                beforeUpload={(file) => handleUpload(file as any)}
                maxCount={1}
              >
                <Button icon={<PaperClipOutlined />} title="上传 PDF / 图片" />
              </Upload>
              <Button
                icon={<LinkOutlined />}
                title="粘贴链接自动识别"
                onClick={() => {
                  const url = window.prompt('请粘贴链接 URL');
                  if (url && /^https?:\/\//.test(url)) {
                    addMessage({ role: 'user', type: 'text', content: `发送链接：${url}` });
                    runRecognitionFlow(() => recognizeLink(url), { label: '正在抓取链接内容…' });
                  }
                }}
              />
              <Button
                icon={<AudioOutlined />}
                type={recording ? 'primary' : 'default'}
                onClick={toggleVoice}
                title="点击 / 长按 语音输入"
              />
              <TextArea
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                autoSize={{ minRows: 1, maxRows: 4 }}
                placeholder="描述你的智能体，或粘贴链接（Enter 发送）"
                style={{ resize: 'none' }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={!input.trim()}
                title="发送（Enter）"
              />
            </Space.Compact>
            <div style={{ marginTop: 6, fontSize: 11, color: '#999', textAlign: 'center' }}>
              <ThunderboltOutlined /> 医小管仅在您授权下处理数据, 全程仅操作本人表单（单文件 ≤ 30M）
            </div>
          </div>
        </div>
      )}

      {/* 浮层展开 / 收起 keyframes */}
      <style>{`
        @keyframes agentChatPanelIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </>
  );
};

export default AgentAssistant;