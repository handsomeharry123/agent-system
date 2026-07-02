/**
 * §3.1.1 消息气泡组件
 *
 * 12 种消息类型 (text / file-detect / image-detect / link-detect /
 * detecting / prefill / autofix-req / autofix-done / error /
 * pre-audit-summary / pre-audit-issue / pre-audit-test / pre-audit-verdict)
 * 按 type 分发渲染。
 *
 * §4.2.1 智能预审:问题汇总 / 单条问题 / 联通测试 / 预审结论 全部由 Agent 对话窗口呈现
 *   (不在审核注册页新增独立面板 / 卡片 / 状态条)
 */
import { useMemo, useState } from 'react';
import React from 'react';
import { Button, Checkbox, Radio, Space, Tag, Tooltip, Typography } from 'antd';
import {
  ApiOutlined,
  BarChartOutlined,
  BugOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DatabaseOutlined,
  EditOutlined,
  ExperimentOutlined,
  FilePdfOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  LoadingOutlined,
  PictureOutlined,
  RocketOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  UndoOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { AgentMessage, HistoricalPlan, InsightProgress } from './types';
import { confidenceLevel } from './types';

const { Text } = Typography;

/**
 * 文件识别 / 图片识别 / 链接抓取气泡
 * 取代旧的「全部采纳 + 每字段一个按钮」: 改为「多选 Checkbox + 底部「确认采纳 (N)」主按钮」
 * - 与 PRD §3.2.1 智能预审 / 智能审查「勾选 + 确认采纳」交互同构
 * - 取消「高置信度自动采纳」: 即便 confidence >= 0.9, 仍需用户显式勾选才能确认
 * - 默认按置信度从高到低排序; 已采纳字段 (acknowledged === true) 在 store 层识别, 默认排除
 */
interface FileDetectBubbleProps {
  msg: AgentMessage;
  onAcknowledgeFields?: (fieldKeys: string[]) => void;
  /** 兼容旧的单字段采纳回调 (仅在没有任何字段时可走兜底分支) */
  onAcknowledge?: (fieldKey: string) => void;
}
const FileDetectBubble = ({ msg, onAcknowledgeFields, onAcknowledge }: FileDetectBubbleProps) => {
  const wrap: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: 12,
  };
  const bubble: React.CSSProperties = {
    maxWidth: '84%',
    background: '#FFFFFF',
    color: '#1F1F1F',
    padding: '10px 14px',
    borderRadius: 12,
    borderTopLeftRadius: 4,
    fontSize: 13,
    lineHeight: 1.6,
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
  };
  // 字段按 confidence 倒序; 已被 store 标记 acknowledged=true 的字段(已采纳)排除,不让用户重复操作
  const allFields = msg.payload?.detectedFields ?? [];
  const pendingFields = useMemo(
    () => [...allFields].sort((a, b) => b.confidence - a.confidence),
    [allFields],
  );
  // 兜底: 如果 store 没有 acknowledged 标志(单测/旧数据), 仍按字段全选
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(pendingFields.map((f) => f.fieldKey)),
  );
  const allSelected = pendingFields.length > 0 && selected.size === pendingFields.length;
  const noneSelected = selected.size === 0;
  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(pendingFields.map((f) => f.fieldKey)));
  };
  const onConfirm = () => {
    if (noneSelected) return;
    if (onAcknowledgeFields) {
      onAcknowledgeFields(pendingFields.filter((f) => selected.has(f.fieldKey)).map((f) => f.fieldKey));
    } else if (onAcknowledge) {
      // 兜底分支: 走旧接口逐字段采纳
      pendingFields.filter((f) => selected.has(f.fieldKey)).forEach((f) => onAcknowledge(f.fieldKey));
    }
    setSelected(new Set());
  };
  return (
    <div style={wrap}>
      <div style={bubble}>
        <Space size={6} style={{ marginBottom: 6 }}>
          {msg.type === 'file-detect' ? (
            <Tag color="blue" icon={<FilePdfOutlined />}>
              文件识别
            </Tag>
          ) : msg.type === 'image-detect' ? (
            <Tag color="purple" icon={<PictureOutlined />}>
              图片识别
            </Tag>
          ) : (
            <Tag color="cyan" icon={<LinkOutlined />}>
              链接抓取
            </Tag>
          )}
          {msg.payload?.fileName && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {msg.payload.fileName}
            </Text>
          )}
        </Space>
        <div style={{ marginBottom: 8 }}>{msg.content}</div>
        {pendingFields.length > 0 ? (
          <div
            style={{
              background: '#F5F5F5',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
            }}
          >
            {pendingFields.map((f) => {
              const checked = selected.has(f.fieldKey);
              return (
                <div
                  key={f.fieldKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 0',
                    borderBottom: '1px dashed #E8E8E8',
                  }}
                >
                  <Checkbox
                    checked={checked}
                    onChange={() => toggle(f.fieldKey)}
                    data-testid={`file-detect-field-${f.fieldKey}`}
                  >
                    <span style={{ color: '#1F1F1F' }}>{f.fieldKey}</span>
                  </Checkbox>
                  <span style={{ flex: 1, color: '#666', fontSize: 11 }}>{f.value}</span>
                  <Tooltip title={`来源：${f.source}　置信度：${(f.confidence * 100).toFixed(0)}%`}>
                    <Tag
                      color={
                        confidenceLevel(f.confidence) === 'high'
                          ? 'green'
                          : confidenceLevel(f.confidence) === 'medium'
                            ? 'gold'
                            : 'red'
                      }
                      style={{ margin: 0, fontSize: 11 }}
                    >
                      {(f.confidence * 100).toFixed(0)}%
                    </Tag>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        ) : null}
        {onAcknowledgeFields && pendingFields.length > 0 && (
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <Space size={6}>
              <Checkbox
                checked={allSelected}
                indeterminate={!allSelected && !noneSelected}
                onChange={toggleAll}
                data-testid="file-detect-toggle-all"
              >
                全选
              </Checkbox>
              <Text type="secondary" style={{ fontSize: 11 }}>
                已选 {selected.size} / {pendingFields.length} 个
              </Text>
            </Space>
            <Button
              type="primary"
              size="small"
              disabled={noneSelected}
              onClick={onConfirm}
              icon={<CheckCircleOutlined />}
              data-testid="file-detect-confirm"
            >
              确认采纳{selected.size > 0 ? ` (${selected.size})` : ''}
            </Button>
          </div>
        )}
        {/* 兜底: 旧接口, 没有任何 onAcknowledgeFields 时退化为单字段平铺按钮(只读显示不下发) */}
        {!onAcknowledgeFields && onAcknowledge && pendingFields.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <Space wrap>
              {pendingFields.map((f) => (
                <Button key={f.fieldKey} size="small" onClick={() => onAcknowledge(f.fieldKey)}>
                  采纳 {f.fieldKey}
                </Button>
              ))}
            </Space>
          </div>
        )}
      </div>
    </div>
  );
};

interface Props {
  msg: AgentMessage;
  /** prefill 类型气泡点击「采纳本字段」回调 */
  onAcknowledge?: (fieldKey: string) => void;
  /**
   * file-detect / image-detect / link-detect 气泡: 多选采纳回调
   * 接收选中的 fieldKey 列表 (按置信度高 → 低排序, 已采纳 / 已在表单中的字段会被排除)
   * - 取代旧的「全部采纳」主按钮, 改为用户逐项勾选后批量采纳
   * - 与 PRD §3.2.1 智能预审 / 智能审查「勾选 + 确认采纳」交互同构
   */
  onAcknowledgeFields?: (fieldKeys: string[]) => void;
  /** autofix-req 授权 / 拒绝回调 */
  onAuthorizeFix?: (fieldKey: string) => void;
  onRejectFix?: (fieldKey: string) => void;
  // §4.2.1 / §4.3.1 智能预审气泡回调
  /** pre-audit-issue 单条问题「采纳到退回说明」回调 */
  onIssueAdopt?: (problemId: string) => void;
  /** pre-audit-issue 单条问题「忽略」回调 */
  onIssueIgnore?: (problemId: string) => void;
  /** pre-audit-issue 单条问题「定位到字段」回调（注册页智能审查场景） */
  onIssueLocate?: (fieldKey: string) => void;
  /** pre-audit-summary 严重度筛选切换（'all' | severity） */
  onSeverityFilter?: (severity: 'all' | 'error' | 'warning' | 'info') => void;
  /** 当前全局严重度筛选（用于回显 summary 气泡 Radio） */
  severityFilter?: 'all' | 'error' | 'warning' | 'info';
  /** pre-audit-summary 「帮我检查一下」按钮回调（注册页智能审查） */
  onRequestReview?: () => void;
  /** §3.3.2 历史方案复用 · 「复用此方案」回调（按 plan.id 定位） */
  onReusePlan?: (planId: string) => void;
}

/**
 * 时间显示：PRD §3.1.1 字段表 → 对话时间格式 HH:MM, 跨天时显示 YYYY-MM-DD HH:MM
 *  - ts 形如 "2026-06-30 09:30:00" (store.formatNow 产生) 或 ISO 字符串
 */
const fmtTime = (ts: string) => {
  if (!ts) return '';
  // 1) 标准 "YYYY-MM-DD HH:MM:SS" / "YYYY-MM-DD HH:MM" 格式
  const std = ts.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})(?::\d{2})?/);
  if (std) {
    const [, y, m, d, hm] = std;
    const isToday = (() => {
      const now = new Date();
      return (
        Number(y) === now.getFullYear() &&
        Number(m) === now.getMonth() + 1 &&
        Number(d) === now.getDate()
      );
    })();
    return isToday ? hm : `${y}-${m}-${d} ${hm}`;
  }
  // 2) 兜底匹配 HH:MM
  const hmOnly = ts.match(/(\d{2}:\d{2})/);
  if (hmOnly) return hmOnly[1];
  return ts;
};

const AgentMessageBubble = ({
  msg,
  onAcknowledge,
  onAcknowledgeFields,
  onAuthorizeFix,
  onRejectFix,
  onIssueAdopt,
  onIssueIgnore,
  onIssueLocate,
  onSeverityFilter,
  onRequestReview,
  onReusePlan,
  severityFilter = 'all',
}: Props) => {
  const isAgent = msg.role === 'agent';
  // §3.4.1.2 「接入进度·核心指标」→ 对话窗口内呈现的「洞察详情」气泡:
  //   - 一键直达按钮（完善台账 / 发起准入评测 / 查看监控告警 / 编辑修改）通过 useNavigate 跳转
  const navigate = useNavigate();

  // ─── 用户消息 ───
  if (!isAgent) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div
          style={{
            maxWidth: '78%',
            background: '#1677FF',
            color: '#FFFFFF',
            padding: '10px 14px',
            borderRadius: 12,
            borderTopRightRadius: 4,
            fontSize: 13,
            lineHeight: 1.6,
            boxShadow: '0 2px 8px rgba(22, 119, 255, 0.18)',
          }}
        >
          <Space size={6} style={{ marginBottom: 4, opacity: 0.85 }}>
            {msg.payload?.fileName ? (
              <>
                {msg.payload.fileName.toLowerCase().endsWith('.pdf') ? (
                  <FilePdfOutlined />
                ) : (
                  <PictureOutlined />
                )}
                <Text style={{ color: '#fff', fontSize: 12 }}>{msg.payload.fileName}</Text>
              </>
            ) : null}
            {msg.payload?.fileSize ? (
              <Text style={{ color: '#fff', fontSize: 11, opacity: 0.8 }}>
                {(msg.payload.fileSize / 1024 / 1024).toFixed(1)} MB
              </Text>
            ) : null}
          </Space>
          <div>{msg.content}</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
            {fmtTime(msg.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // ─── Agent 消息（按 type 分发） ───
  const wrap: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: 12,
  };
  const bubble: React.CSSProperties = {
    maxWidth: '84%',
    background: '#FFFFFF',
    color: '#1F1F1F',
    padding: '10px 14px',
    borderRadius: 12,
    borderTopLeftRadius: 4,
    fontSize: 13,
    lineHeight: 1.6,
    border: '1px solid #F0F0F0',
    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
  };

  switch (msg.type) {
    case 'detecting':
      return (
        <div style={wrap}>
          <div style={bubble}>
            <Space size={8}>
              <span
                className="agent-robot-antenna"
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  border: '2px solid #1677FF',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'agent-antenna-spin 1s linear infinite',
                }}
              />
              <Text type="secondary">{msg.content}</Text>
            </Space>
          </div>
        </div>
      );

    case 'file-detect':
    case 'image-detect':
    case 'link-detect':
      return <FileDetectBubble msg={msg} onAcknowledgeFields={onAcknowledgeFields} onAcknowledge={onAcknowledge} />;

    case 'prefill':
      return (
        <div style={wrap}>
          <div style={bubble}>
            <Space size={6} style={{ marginBottom: 6 }}>
              <Tag color="blue">✨ AI 预填</Tag>
            </Space>
            <div style={{ marginBottom: 8 }}>{msg.content}</div>
            {msg.payload?.detectedFields && (
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                {msg.payload.detectedFields.map((f) => (
                  <div
                    key={f.fieldKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ minWidth: 80, color: '#1F1F1F' }}>{f.fieldKey}</span>
                    <Tag
                      color={
                        confidenceLevel(f.confidence) === 'high'
                          ? 'green'
                          : confidenceLevel(f.confidence) === 'medium'
                            ? 'gold'
                            : 'red'
                      }
                      style={{ margin: 0 }}
                    >
                      {(f.confidence * 100).toFixed(0)}%
                    </Tag>
                    {confidenceLevel(f.confidence) === 'low' && (
                      <Text type="warning" style={{ fontSize: 11 }}>
                        <WarningOutlined /> 请确认
                      </Text>
                    )}
                  </div>
                ))}
              </Space>
            )}
          </div>
        </div>
      );

    case 'prefill':
      return (
        <div style={wrap}>
          <div style={bubble}>
            <Space size={6} style={{ marginBottom: 6 }}>
              <Tag color="blue">✨ AI 预填</Tag>
            </Space>
            <div style={{ marginBottom: 8 }}>{msg.content}</div>
            {msg.payload?.detectedFields && (
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                {msg.payload.detectedFields.map((f) => (
                  <div
                    key={f.fieldKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ minWidth: 80, color: '#1F1F1F' }}>{f.fieldKey}</span>
                    <Tag
                      color={
                        confidenceLevel(f.confidence) === 'high'
                          ? 'green'
                          : confidenceLevel(f.confidence) === 'medium'
                            ? 'gold'
                            : 'red'
                      }
                      style={{ margin: 0 }}
                    >
                      {(f.confidence * 100).toFixed(0)}%
                    </Tag>
                    {confidenceLevel(f.confidence) === 'low' && (
                      <Text type="warning" style={{ fontSize: 11 }}>
                        <WarningOutlined /> 请确认
                      </Text>
                    )}
                  </div>
                ))}
              </Space>
            )}
          </div>
        </div>
      );

    case 'autofix-req':
      return (
        <div style={wrap}>
          <div
            style={{
              ...bubble,
              borderColor: '#FFA940',
              background: '#FFFBE6',
            }}
          >
            <Space size={6} style={{ marginBottom: 6 }}>
              <Tag color="orange">🛠 Agent 请求纠错</Tag>
            </Space>
            <div style={{ marginBottom: 8 }}>{msg.content}</div>
            {msg.payload?.suggestions?.map((s) => (
              <div
                key={s.fieldKey}
                style={{
                  background: '#FFF',
                  border: '1px solid #FFD591',
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 12, color: '#1F1F1F', marginBottom: 4 }}>
                  <b>{s.fieldKey}</b>：{s.reason}
                </div>
                <div style={{ fontSize: 12, marginBottom: 4 }}>
                  <Text type="secondary" delete>
                    {s.currentValue || '（空）'}
                  </Text>
                  <span style={{ margin: '0 6px' }}>→</span>
                  <Text strong style={{ color: '#52C41A' }}>
                    {s.suggestedValue}
                  </Text>
                </div>
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => onAuthorizeFix?.(s.fieldKey)}
                  >
                    授权修正
                  </Button>
                  <Button size="small" onClick={() => onRejectFix?.(s.fieldKey)}>
                    暂不修正
                  </Button>
                </Space>
              </div>
            ))}
          </div>
        </div>
      );

    case 'autofix-done':
      return (
        <div style={wrap}>
          <div style={bubble}>
            <Space size={6} style={{ marginBottom: 4 }}>
              <CheckCircleOutlined style={{ color: '#52C41A' }} />
              <Tag color="green">已自动修正</Tag>
            </Space>
            <div>{msg.content}</div>
          </div>
        </div>
      );

    case 'error':
      return (
        <div style={wrap}>
          <div
            style={{
              ...bubble,
              borderColor: '#FFA39E',
              background: '#FFF1F0',
              color: '#CF1322',
            }}
          >
            <Space size={6} style={{ marginBottom: 4 }}>
              <CloseCircleOutlined />
              <Text strong style={{ color: '#CF1322' }}>
                识别失败
              </Text>
              {msg.payload?.errorCode && (
                <Tag color="red">{msg.payload.errorCode}</Tag>
              )}
            </Space>
            <div>{msg.content}</div>
          </div>
        </div>
      );

    // ─── §4.2.1 智能预审 · 汇总 ───
    case 'pre-audit-summary': {
      const s = msg.payload?.preAuditSummary;
      return (
        <div style={wrap}>
          <div
            style={{
              ...bubble,
              borderColor: '#91CAFF',
              background: 'linear-gradient(90deg,#F0F8FF 0%, #FFFFFF 100%)',
            }}
            data-testid="pre-audit-summary-msg"
          >
            <Space size={6} style={{ marginBottom: 6 }}>
              <ThunderboltOutlined style={{ color: '#1677FF' }} />
              <Tag color="blue">智能预审 · 汇总</Tag>
            </Space>
            <div style={{ marginBottom: 8 }}>{msg.content}</div>
            {s && (
              <Space size={6} wrap style={{ marginBottom: 8 }}>
                <Tag color="error" icon={<BugOutlined />}>错误 {s.errors}</Tag>
                <Tag color="warning" icon={<WarningOutlined />}>警告 {s.warnings}</Tag>
                <Tag color="processing" icon={<InfoCircleOutlined />}>提示 {s.infos}</Tag>
                <Tag>共 {s.total} 项</Tag>
              </Space>
            )}
            {onRequestReview && (
              <div style={{ marginTop: 6 }}>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<ThunderboltOutlined />}
                  onClick={onRequestReview}
                  data-testid="agent-review-rerun"
                >
                  帮我检查一下
                </Button>
              </div>
            )}
            {onSeverityFilter && s && (
              <div>
                <Text type="secondary" style={{ fontSize: 11, marginRight: 6 }}>
                  按严重度筛选：
                </Text>
                <Radio.Group
                  size="small"
                  value={severityFilter}
                  onChange={(e) => onSeverityFilter(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  data-testid="pre-audit-severity-filter"
                >
                  <Radio.Button value="all">全部</Radio.Button>
                  <Radio.Button value="error">错误 {s.errors}</Radio.Button>
                  <Radio.Button value="warning">警告 {s.warnings}</Radio.Button>
                  <Radio.Button value="info">提示 {s.infos}</Radio.Button>
                </Radio.Group>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ─── §4.2.1 智能预审 · 单条问题 ───
    case 'pre-audit-issue': {
      const baseP = msg.payload?.preAuditIssue;
      if (!baseP) return null;
      // 优先读 window 全局采纳/忽略状态（由 Audit.tsx 监听 CustomEvent 写入）
      const winStatus = (window as any).__preAuditIssueStatus?.[baseP.id];
      const p = { ...baseP, status: winStatus || baseP.status || 'open' };
      const adopted = p.status === 'adopted';
      const ignored = p.status === 'ignored';
      const colorMap = {
        error: { border: '#FFA39E', bg: '#FFF1F0', icon: <BugOutlined style={{ color: '#FF4D4F' }} /> },
        warning: { border: '#FFE58F', bg: '#FFFBE6', icon: <WarningOutlined style={{ color: '#FAAD14' }} /> },
        info: { border: '#91D5FF', bg: '#E6F4FF', icon: <InfoCircleOutlined style={{ color: '#1677FF' }} /> },
      };
      const c = colorMap[p.severity];
      return (
        <div style={wrap}>
          <div
            style={{
              ...bubble,
              borderColor: adopted ? '#B7EB8F' : ignored ? '#D9D9D9' : c.border,
              background: adopted ? '#F6FFED' : ignored ? '#FAFAFA' : c.bg,
              opacity: ignored ? 0.6 : 1,
            }}
            data-testid={`pre-audit-issue-msg-${p.id}`}
          >
            <Space size={8} align="start">
              {adopted ? <CheckCircleOutlined style={{ color: '#52C41A' }} /> : c.icon}
              <div style={{ flex: 1 }}>
                <Space size={6} wrap>
                  <Text strong style={{ fontSize: 13 }}>{p.title}</Text>
                  <Tag
                    color={p.severity === 'error' ? 'error' : p.severity === 'warning' ? 'warning' : 'processing'}
                    style={{ fontSize: 11 }}
                  >
                    {p.fieldKey}
                  </Tag>
                  {adopted && <Tag color="success">✓ 已采纳</Tag>}
                  {ignored && <Tag>已忽略</Tag>}
                </Space>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{p.reason}</div>
                {!adopted && !ignored && (
                  <Space size={4} wrap style={{ marginTop: 6 }}>
                    {onIssueLocate && p.fieldKey && (
                      <Button
                        size="small"
                        type="link"
                        data-testid={`pre-audit-issue-locate-${p.id}`}
                        onClick={() => onIssueLocate(p.fieldKey!)}
                        style={{ padding: 0 }}
                      >
                        定位到字段
                      </Button>
                    )}
                    {onIssueAdopt && (
                      <Button
                        size="small"
                        type="link"
                        data-testid={`pre-audit-issue-adopt-${p.id}`}
                        onClick={() => onIssueAdopt?.(p.id)}
                        style={{ padding: 0 }}
                      >
                        采纳到退回说明
                      </Button>
                    )}
                    {onIssueIgnore && (
                      <Button
                        size="small"
                        type="link"
                        data-testid={`pre-audit-issue-ignore-${p.id}`}
                        onClick={() => onIssueIgnore?.(p.id)}
                        style={{ padding: 0 }}
                      >
                        忽略本条
                      </Button>
                    )}
                  </Space>
                )}
              </div>
            </Space>
          </div>
        </div>
      );
    }

    // ─── §4.2.1 智能预审 · 联通测试 ───
    case 'pre-audit-test': {
      // 优先读 window.__preAuditTest (实时状态), 兜底用 msg.payload.preAuditTest
      const t = (window as any).__preAuditTest || msg.payload?.preAuditTest;
      if (!t) return null;
      const stageColor = (s: string) => {
        if (s === 'ok') return <CheckCircleOutlined style={{ color: '#52C41A' }} />;
        if (s === 'fail') return <CloseCircleOutlined style={{ color: '#FF4D4F' }} />;
        if (s === 'running') return <LoadingOutlined style={{ color: '#1677FF' }} />;
        return <span style={{ color: '#999' }}>·</span>;
      };
      return (
        <div style={wrap}>
          <div style={bubble} data-testid="pre-audit-test-msg">
            <Space size={6} style={{ marginBottom: 6 }}>
              <ApiOutlined style={{ color: '#1677FF' }} />
              <Tag color="blue">联通测试</Tag>
            </Space>
            <div style={{ marginBottom: 8 }}>{msg.content}</div>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {t.steps.map((s) => (
                <div
                  key={s.stage}
                  data-testid={`pre-audit-test-step-${s.stage}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    color: s.status === 'fail' ? '#FF4D4F' : '#1F1F1F',
                  }}
                >
                  {stageColor(s.status)}
                  <span style={{ minWidth: 80 }}>{s.label}</span>
                  <span style={{ color: '#999', fontSize: 11 }}>
                    {s.latencyMs !== undefined ? `${s.latencyMs}ms` : s.status === 'running' ? '进行中' : '--'}
                  </span>
                  {s.errorCode && (
                    <Tag color="red" style={{ fontSize: 10, marginLeft: 4 }}>
                      {s.errorCode}
                    </Tag>
                  )}
                </div>
              ))}
            </Space>
            {t.result && (
              <div
                style={{
                  marginTop: 8,
                  padding: '6px 10px',
                  borderRadius: 4,
                  background: t.result.ok ? '#F6FFED' : '#FFF1F0',
                  border: `1px solid ${t.result.ok ? '#B7EB8F' : '#FFA39E'}`,
                  color: t.result.ok ? '#389E0D' : '#CF1322',
                  fontSize: 12,
                }}
              >
                {t.result.ok ? '✓ 联通成功' : '✗ 联通失败'}：{t.result.message}
                {t.totalMs !== undefined && (
                  <span style={{ marginLeft: 8, color: '#999' }}>总耗时 {t.totalMs}ms</span>
                )}
              </div>
            )}
            {!t.result && (
              <Text type="secondary" style={{ fontSize: 11, marginTop: 6, display: 'block' }}>
                正在执行…
              </Text>
            )}
          </div>
        </div>
      );
    }

    // ─── §4.2.1 智能预审 · 结论 ───
    case 'pre-audit-verdict': {
      const v = msg.payload?.preAuditVerdict;
      if (!v) return null;
      const tone =
        v.verdict === 'pass'
          ? { bg: '#F6FFED', border: '#52C41A', icon: <CheckCircleOutlined style={{ color: '#52C41A' }} />, text: '建议通过' }
          : v.verdict === 'reject'
            ? { bg: '#FFF1F0', border: '#FF4D4F', icon: <CloseCircleOutlined style={{ color: '#FF4D4F' }} />, text: '建议退回' }
            : { bg: '#FFFBE6', border: '#FAAD14', icon: <LoadingOutlined style={{ color: '#FAAD14' }} />, text: '信息待补' };
      return (
        <div style={wrap}>
          <div
            style={{ ...bubble, background: tone.bg, borderColor: tone.border }}
            data-testid="pre-audit-verdict-msg"
          >
            <Space size={6} style={{ marginBottom: 6 }}>
              <ThunderboltOutlined style={{ color: tone.border }} />
              <Tag color={v.verdict === 'pass' ? 'success' : v.verdict === 'reject' ? 'error' : 'warning'}>
                预审结论 · {tone.text}
              </Tag>
            </Space>
            <div style={{ fontSize: 13, marginBottom: 4 }}>{msg.content}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              理由：{v.reason}（错误 {v.fatalCount} · 警告 {v.warningCount}）
            </Text>
          </div>
        </div>
      );
    }

    // ─── §3.3.2 历史方案复用 · 气泡 ───
    case 'historical-plan': {
      const plans = msg.payload?.historicalPlans ?? [];
      const source = msg.payload?.historicalPlanSource;
      const sourceLabel =
        source === 'test-fail'
          ? '失败诊断 · 历史方案复用'
          : source === 'test-pass'
            ? '测试通过 · 相似历史配置'
            : '历史方案复用';
      return (
        <div style={wrap}>
          <div style={bubble} data-testid="historical-plan-msg">
            <Space size={6} style={{ marginBottom: 6 }}>
              <HistoryOutlined style={{ color: '#1677FF' }} />
              <Tag color="blue">{sourceLabel}</Tag>
            </Space>
            <div style={{ marginBottom: 10 }}>{msg.content}</div>
            {plans.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                暂无可复用方案
              </Text>
            ) : (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {plans.map((p) => {
                  const score = Math.round(p.matchScore * 100);
                  const scoreColor =
                    score >= 85 ? '#52C41A' : score >= 70 ? '#1677FF' : '#999';
                  return (
                    <div
                      key={p.id}
                      data-testid={`historical-plan-card-${p.id}`}
                      style={{
                        border: '1px solid #E8E8E8',
                        background: '#FFFFFF',
                        borderRadius: 6,
                        padding: '10px 12px',
                      }}
                    >
                      <Space size={6} wrap>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0 8px',
                            height: 20,
                            lineHeight: '20px',
                            borderRadius: 10,
                            background: scoreColor,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          匹配 {score}%
                        </span>
                        <Text strong style={{ fontSize: 13 }}>
                          {p.agentName}
                        </Text>
                        <Tag color="blue">{p.mode}</Tag>
                        <Tag color="default">{p.endpointPattern}</Tag>
                      </Space>
                      <div style={{ marginTop: 4, fontSize: 12 }}>
                        <Text type="secondary">症状：</Text>
                        {p.symptom}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 12 }}>
                        <Text type="secondary">处置：</Text>
                        {p.fix}
                      </div>
                      <Space size={6} style={{ marginTop: 6 }}>
                        <Button
                          size="small"
                          type="primary"
                          icon={<UndoOutlined />}
                          data-testid={`historical-plan-reuse-${p.id}`}
                          onClick={() => onReusePlan?.(p.id)}
                        >
                          复用此方案
                        </Button>
                        <Tooltip title="查看该方案的详细配置（脱敏信息）">
                          <Button size="small" icon={<SearchOutlined />}>
                            查看细节
                          </Button>
                        </Tooltip>
                      </Space>
                    </div>
                  );
                })}
              </Space>
            )}
          </div>
        </div>
      );
    }

    // ─── §3.4.1.2 注册信息详情页 · 接入进度 + 核心指标 + 一键直达 ───
    // PRD:「不在详情页新增嵌入式『接入进度 · 核心指标』卡片」, 改为在对话窗口呈现。
    // 此处为紧凑版(适配 ~440px 浮层宽度), 与原 InsightDetailPanel 内容等价但去掉 Card 外壳。
    case 'insight-detail': {
      const p: InsightProgress | undefined = msg.payload?.insightProgress;
      if (!p) return null;
      const phaseIdx = p.phase === 'success' ? 2 : p.phase === 'reviewing' ? 1 : 0;
      const phaseLabelMap: Record<InsightProgress['phase'], string> = {
        pending: '信息待审查',
        reviewing: '信息审查中',
        success: '接入成功',
      };
      const phaseDescMap: Record<InsightProgress['phase'], string> = {
        pending: '已提交至审核队列',
        reviewing: '管理员审核中',
        success: '审核通过，已同步台账',
      };
      const phaseColorMap: Record<InsightProgress['phase'], string> = {
        pending: '#FAAD14',
        reviewing: '#1677FF',
        success: '#52C41A',
      };
      const metricBg = (tone?: 'success' | 'warning' | 'info') =>
        tone === 'success' ? '#F6FFED' : tone === 'warning' ? '#FFFBE6' : '#F0F8FF';
      const actionIcon = (k?: string) => {
        if (k === 'ledger') return <DatabaseOutlined />;
        if (k === 'eval') return <ExperimentOutlined />;
        if (k === 'edit') return <EditOutlined />;
        return <RocketOutlined />;
      };
      return (
        <div style={wrap}>
          <div
            data-testid="insight-detail-msg"
            style={{
              ...bubble,
              borderColor: '#91CAFF',
              background: 'linear-gradient(90deg,#F0F8FF 0%, #FFFFFF 100%)',
              padding: '12px 14px',
            }}
          >
            <Space size={6} style={{ marginBottom: 8 }} wrap>
              <ThunderboltOutlined style={{ color: '#1677FF' }} />
              <Tag color="blue">医小管 · 接入进度</Tag>
              <Tag
                color={p.phase === 'success' ? 'success' : p.phase === 'reviewing' ? 'processing' : 'warning'}
              >
                {phaseLabelMap[p.phase]}
              </Tag>
            </Space>

            {/* 阶段进度条 — 用最简三段水平线替代 antd Steps, 适配窄宽 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                margin: '6px 0 10px',
              }}
            >
              {(['pending', 'reviewing', 'success'] as InsightProgress['phase'][]).map((ph, i) => {
                const reached = i <= phaseIdx;
                const isCurrent = i === phaseIdx;
                return (
                  <React.Fragment key={ph}>
                    <div
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: 11,
                        color: reached ? phaseColorMap[p.phase] : '#BFBFBF',
                        fontWeight: isCurrent ? 600 : 400,
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          margin: '0 auto 4px',
                          background: reached ? phaseColorMap[p.phase] : '#F0F0F0',
                          color: '#FFF',
                          fontSize: 11,
                          lineHeight: '18px',
                          fontWeight: 600,
                        }}
                      >
                        {reached ? (i === 2 ? '✓' : i + 1) : i + 1}
                      </div>
                      {phaseLabelMap[ph]}
                    </div>
                    {i < 2 && (
                      <div
                        style={{
                          flex: '0 0 18px',
                          height: 2,
                          background: i < phaseIdx ? phaseColorMap[p.phase] : '#F0F0F0',
                          marginBottom: 14,
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* 当前阶段说明 */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E8E8E8',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              <Text strong style={{ fontSize: 12 }}>当前阶段：</Text>
              <span style={{ color: phaseColorMap[p.phase], marginLeft: 4 }}>
                {phaseLabelMap[p.phase]}
              </span>
              <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
                {phaseDescMap[p.phase]}
              </div>
            </div>

            {/* 核心指标 — 2 列栅格, 紧凑卡片 */}
            {p.metrics.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <Text strong style={{ fontSize: 12 }}>
                  <BarChartOutlined /> 核心服务指标
                </Text>
                <div
                  style={{
                    marginTop: 6,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                  }}
                >
                  {p.metrics.map((m) => (
                    <div
                      key={m.label}
                      style={{
                        background: metricBg(m.tone),
                        border: '1px solid #E8E8E8',
                        borderRadius: 6,
                        padding: '6px 8px',
                      }}
                    >
                      <div style={{ fontSize: 11, color: '#666' }}>{m.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 下一步动作 — 一键直达 */}
            {p.nextActions.length > 0 && (
              <div>
                <Text strong style={{ fontSize: 12 }}>
                  <RocketOutlined /> 下一步动作
                </Text>
                <div
                  style={{
                    marginTop: 6,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  {p.nextActions.map((a) => (
                    <Tooltip
                      key={a.key}
                      title={a.enabled ? a.description : '当前账号暂无该操作权限'}
                    >
                      <Button
                        size="small"
                        type={a.key === 'ledger' ? 'primary' : 'default'}
                        icon={actionIcon(a.key)}
                        disabled={!a.enabled || !a.path}
                        onClick={() => a.path && navigate(a.path)}
                      >
                        {a.label}
                      </Button>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'text':
    default:
      return (
        <div style={wrap}>
          <div style={bubble}>
            <div>{msg.content}</div>
          </div>
        </div>
      );
  }
};

export default AgentMessageBubble;