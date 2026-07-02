/**
 * §3.3 智能化连通测试面板
 *
 * 功能：
 *   - 启动测试：依次呈现 DNS 解析 → 建连 → 认证 → 请求 → 返回 5 阶段状态与耗时
 *   - 失败自动诊断：定位失败阶段、错误码、原因
 *   - 解决步骤：编号化建议 + 「按建议修改」（触发 onLocateField）
 *   - 历史方案复用：按匹配度展示历史成功方案 + 「复用此方案」
 *   - 测试通过：方案沉淀提示 + 知识库新增
 *
 * 父组件：Registration.tsx 通过 form + testFields 获取实时数据，
 *        调用 startTest(formValues) 触发，组件负责推进步骤与写入 store。
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Progress,
  Space,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  KeyOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SendOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { FormInstance } from 'antd';
import { useSmartDraft } from './store';
import type { ConnDiagnostics, ConnStage, ConnStep, HistoricalPlan } from './types';

const { Text, Paragraph } = Typography;

interface Props {
  form?: FormInstance;
  onLocateField?: (fieldKey: string) => void;
  /** 用户填写的接口信息 */
  getConnectionFormValues: () => {
    accessMode?: string;
    apiEndpoint?: string;
    apiKey?: string;
    platformUrl?: string;
    platformKey?: string;
    agentName?: string;
  };
}

const STAGE_META: Record<ConnStage, { label: string; icon: React.ReactNode }> = {
  dns: { label: 'DNS 解析', icon: <GlobalOutlined /> },
  connect: { label: '建立连接', icon: <ApiOutlined /> },
  auth: { label: '鉴权验证', icon: <KeyOutlined /> },
  request: { label: '发送请求', icon: <SendOutlined /> },
  response: { label: '接收响应', icon: <ExperimentOutlined /> },
};

const STAGE_ORDER: ConnStage[] = ['dns', 'connect', 'auth', 'request', 'response'];

const ConnectivityTester: React.FC<Props> = ({ onLocateField, getConnectionFormValues }) => {
  const {
    connSteps,
    setConnSteps,
    connDiagnostics,
    setConnDiagnostics,
    historicalPlans,
    saveHistoricalPlan,
    pushHistoricalPlans,
  } = useSmartDraft();

  const [running, setRunning] = useState(false);
  // 本地状态镜像 + 写 store：保证 functional update 类型安全
  const [localSteps, setLocalSteps] = useState<ConnStep[]>([]);
  const [localDiagnostics, setLocalDiagnostics] = useState<ConnDiagnostics | null>(null);

  // 模拟故障注入：当 apiKey 包含 "expired" 或 endpoint 含 "timeout" 时在指定阶段失败
  const decideOutcome = (vals: ReturnType<Props['getConnectionFormValues']>) => {
    const ek = vals.apiEndpoint || '';
    const ak = vals.apiKey || '';
    if (/badhost/.test(ek)) {
      return { failStage: 'dns' as ConnStage, code: 'NXDOMAIN', reason: '无法解析接口域名，请检查接口地址' };
    }
    if (/504-FAIL/.test(ak)) {
      return { failStage: 'connect' as ConnStage, code: '504', reason: '网关超时（接口超时），请检查网络与平台地址连通性' };
    }
    if (/401-FAIL/.test(ak)) {
      return { failStage: 'auth' as ConnStage, code: '401', reason: '鉴权失败，API Key 无效或已过期' };
    }
    if (/400/.test(ek)) {
      return { failStage: 'request' as ConnStage, code: '400', reason: '请求参数不符，请核对必填字段与 Content-Type' };
    }
    return { failStage: null, code: null, reason: null };
  };

  // 构建诊断的解决步骤
  const buildSteps = (
    failStage: ConnStage | null,
    code: string | null,
  ) => {
    if (!failStage || !code) return [];
    const stepsMap: Record<ConnStage, Array<{ idx: number; title: string; detail: string; fieldKey?: string }>> = {
      dns: [
        { idx: 1, title: '检查接口域名拼写', detail: '核对接口地址是否存在明显拼写错误，可改用 IP 探测网络层是否可达', fieldKey: 'apiEndpoint' },
        { idx: 2, title: '确认 DNS 服务器配置', detail: '在终端执行 nslookup / dig，确认内网 DNS 是否能解析该域名' },
        { idx: 3, title: '联系平台运维确认出口', detail: '如使用内网域名，请确认平台已加入白名单' },
      ],
      connect: [
        { idx: 1, title: '延长请求超时阈值', detail: '将超时从 5s 调整到 30s，并启用长连接复用（参见过往成功方案 hp-1）', fieldKey: 'apiEndpoint' },
        { idx: 2, title: '确认平台 URL 已签发', detail: 'SDK / OTel 接入需要先点击「获取 SDK / OTel」拿到有效的 platformUrl', fieldKey: 'platformUrl' },
        { idx: 3, title: '检查网络代理 / 防火墙', detail: '联系信息科确认目标端口是否在出站白名单中' },
      ],
      auth: [
        { idx: 1, title: '确认 API Key 是否有效', detail: '在请求头添加 X-Api-Key，并通过平台重新签发密钥', fieldKey: 'apiKey' },
        { idx: 2, title: '检查密钥字段是否密文粘贴', detail: '密钥包含前缀 sk- 时，请完整复制而非截取', fieldKey: 'apiKey' },
        { idx: 3, title: '确认账号未被禁用', detail: '错误 401 也可能由账号停用引起，可在监控告警台账查询该 Key 状态' },
      ],
      request: [
        { idx: 1, title: '核对请求体参数', detail: '移除冗余字段、补全必填字段；类型与示例保持一致', fieldKey: 'apiEndpoint' },
        { idx: 2, title: '核对请求头 Content-Type', detail: 'JSON 请求需声明 application/json；表单提交使用 application/x-www-form-urlencoded' },
        { idx: 3, title: '参考历史成功方案', detail: '过往「门诊预问诊智能体」在修复后联通成功，可一键复用', fieldKey: 'apiEndpoint' },
      ],
      response: [
        { idx: 1, title: '检查响应体大小与解析', detail: '若响应过大被截断，可分页 / 流式接收' },
        { idx: 2, title: '核对返回 schema', detail: '确认返回 JSON 结构与 SDK 期望一致，必要时启用容错解析' },
      ],
    };
    return stepsMap[failStage] || [];
  };

  // 启动测试
  const startTest = useCallback(async () => {
    const v = getConnectionFormValues();
    // 校验必填
    if (v.accessMode === 'API' && !v.apiEndpoint) {
      message.error('请先填写接口地址');
      return;
    }
    if ((v.accessMode === 'SDK' || v.accessMode === 'OTel') && !v.platformUrl) {
      message.error('请先获取 SDK / OTel 平台 URL');
      return;
    }

    setRunning(true);
    setLocalDiagnostics(null);
    setConnDiagnostics(null);

    const outcomes = decideOutcome(v);
    const initSteps: ConnStep[] = STAGE_ORDER.map((stage) => ({
      stage,
      label: STAGE_META[stage].label,
      status: 'pending',
    }));
    setLocalSteps(initSteps);
    setConnSteps(initSteps);

    // 逐步推进
    for (let i = 0; i < STAGE_ORDER.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 600));
      const stage = STAGE_ORDER[i];
      const isFailStage = outcomes.failStage === stage;
      // 通过 setLocalSteps 的 functional update 推进 (本地副本决定 UI 渲染)
      setLocalSteps((prev) => {
        const next = [...prev];
        const target = next.find((s) => s.stage === stage);
        if (!target) return prev;
        target.status = isFailStage ? 'fail' : 'running';
        target.latencyMs = 80 + Math.floor(Math.random() * 120);
        if (isFailStage && outcomes.code && outcomes.reason) {
          target.errorCode = outcomes.code;
          target.errorReason = outcomes.reason;
        }
        return next;
      });
      if (isFailStage) {
        // 把后续阶段 mark pending 并停止
        setLocalSteps((prev) =>
          prev.map((s) =>
            STAGE_ORDER.indexOf(s.stage) > i ? { ...s, status: 'pending' } : s,
          ),
        );
        // 生成诊断
        const diag: ConnDiagnostics = {
          failureStage: outcomes.failStage!,
          errorCode: outcomes.code!,
          errorReason: outcomes.reason!,
          hintFieldKey:
            outcomes.failStage === 'auth' ? 'apiKey' :
            outcomes.failStage === 'dns' ? 'apiEndpoint' :
            outcomes.failStage === 'request' ? 'apiEndpoint' :
            outcomes.failStage === 'connect' ? 'platformUrl' : undefined,
          steps: buildSteps(outcomes.failStage!, outcomes.code),
        };
        setLocalDiagnostics(diag);
        setRunning(false);
        message.error(`测试验证异常（${outcomes.code}）`);
        // §3.3.2 历史方案复用：失败时按错误码匹配 Top3,推一条 'historical-plan' 进对话气泡
        //   - 同 source='test-fail' 既有消息会被新推送替换(去重)
        //   - 若知识库为空则不上推
        pushHistoricalPlans(recommendPlansForDiagnostics(outcomes), 'test-fail');
        return;
      }
      // 当前阶段成功 → 标 ok
      setLocalSteps((prev) => {
        const next = [...prev];
        const target = next.find((s) => s.stage === stage);
        if (target) target.status = 'ok';
        return next;
      });
    }
    // 全程通过
    setRunning(false);
    message.success('测试验证正常');
    // 沉淀为历史方案（脱敏：endpoint 只保留 path）
    const m = /https?:\/\/[^/]+(\/.+)/.exec(v.apiEndpoint || '');
    const endpointPattern = m ? m[1] : '/api/agent';
    saveHistoricalPlan({
      agentName: v.agentName || '未命名',
      mode: v.accessMode || 'API',
      endpointPattern,
      symptom: '联通成功',
      fix: '本次配置正确，已脱敏沉淀为知识库供后续复用',
      matchScore: 0,
    });
    // §3.3.2 历史方案：通过后推荐若干相似历史配置
    pushHistoricalPlans(recommendPlansForPass(historicalPlans), 'test-pass');
  }, [getConnectionFormValues, setConnSteps, setConnDiagnostics, saveHistoricalPlan, buildSteps, pushHistoricalPlans, historicalPlans]);

  // 当组件 mount 时把历史匹配度排个序
  useEffect(() => {
    // no-op; 仅占位保持 hook 顺序稳定
  }, []);

  // §3.3.2 历史方案复用：根据失败诊断 (failStage + errorCode) 匹配 Top3
  const recommendPlansForDiagnostics = (
    outcomes: ReturnType<typeof decideOutcome>,
  ): HistoricalPlan[] => {
    if (!historicalPlans.length) return [];
    const code = outcomes.code || '';
    return [...historicalPlans]
      .map((p) => {
        let score = 0.5;
        if (p.symptom.includes(code)) score += 0.35;
        if (
          (outcomes.failStage === 'auth' && p.symptom.includes('401')) ||
          (outcomes.failStage === 'connect' && p.symptom.includes('504'))
        ) {
          score += 0.1;
        }
        return { ...p, matchScore: Math.min(0.99, score) };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  };

  // 通过时推荐：默认按 matchScore 排序 Top3
  const recommendPlansForPass = (plans: HistoricalPlan[]): HistoricalPlan[] => {
    if (!plans.length) return [];
    return [...plans]
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
  };

  const totalSteps = STAGE_ORDER.length;
  const okCount = localSteps.filter((s) => s.status === 'ok').length;
  const failIdx = localSteps.findIndex((s) => s.status === 'fail');
  const progressPct =
    failIdx >= 0
      ? Math.round(((failIdx + 0.5) / totalSteps) * 100)
      : okCount === totalSteps && totalSteps > 0
        ? 100
        : Math.round((okCount / totalSteps) * 100);
  // 同步本地 steps / diagnostics 到 store (供 Registration 提交门控读取)
  useEffect(() => {
    setConnSteps(localSteps);
  }, [localSteps, setConnSteps]);
  useEffect(() => {
    setConnDiagnostics(localDiagnostics);
  }, [localDiagnostics, setConnDiagnostics]);

  return (
    <div data-testid="connectivity-tester">
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {/* 测试控制条 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: running
              ? 'linear-gradient(90deg, #E6F4FF 0%, #FFFFFF 100%)'
              : '#FAFAFA',
            border: `1px solid ${running ? '#91CAFF' : '#F0F0F0'}`,
            borderRadius: 6,
          }}
        >
          <Space>
            {running ? (
              <LoadingOutlined style={{ color: '#1677FF' }} />
            ) : (
              <ThunderboltOutlined style={{ color: '#1677FF' }} />
            )}
            <Text strong>
              {running
                ? `测试中…正在${STAGE_META[localSteps.find((s) => s.status === 'running')?.stage || 'dns'].label}`
                : '连通测试'}
            </Text>
            {localSteps.length > 0 && (
              <Tag color={failIdx >= 0 ? 'error' : okCount === totalSteps ? 'success' : 'default'}>
                {failIdx >= 0
                  ? `失败于 ${STAGE_META[localSteps[failIdx].stage].label}`
                  : okCount === totalSteps
                    ? '全流程通过'
                    : `已通过 ${okCount}/${totalSteps}`}
              </Tag>
            )}
          </Space>
          <Space>
            <Button
              type="primary"
              icon={running ? <LoadingOutlined /> : <PlayCircleOutlined />}
              loading={running}
              onClick={startTest}
            >
              {running ? '测试中…' : '测试验证'}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setConnSteps([]);
                setConnDiagnostics(null);
              }}
              disabled={running}
            >
              重置
            </Button>
          </Space>
        </div>

        {/* 进度条 */}
        {localSteps.length > 0 && (
          <Progress
            percent={progressPct}
            size="small"
            status={failIdx >= 0 ? 'exception' : okCount === totalSteps ? 'success' : 'active'}
          />
        )}

        {/* 阶段时间线 */}
        {localSteps.length > 0 && (
          <Card size="small" bodyStyle={{ padding: 12 }}>
            <Timeline
              items={localSteps.map((s) => {
                const meta = STAGE_META[s.stage];
                const color =
                  s.status === 'ok'
                    ? 'green'
                    : s.status === 'fail'
                      ? 'red'
                      : s.status === 'running'
                        ? 'blue'
                        : 'gray';
                return {
                  color,
                  dot:
                    s.status === 'running' ? (
                      <LoadingOutlined style={{ color: '#1677FF' }} />
                    ) : (
                      meta.icon
                    ),
                  children: (
                    <Space size={6} wrap>
                      <Text strong style={{ fontSize: 13 }}>{meta.label}</Text>
                      {s.status === 'ok' && (
                        <>
                          <Tag color="green" style={{ margin: 0 }}>
                            <CheckCircleOutlined /> 通过
                          </Tag>
                          {s.latencyMs !== undefined && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              耗时 {s.latencyMs}ms
                            </Text>
                          )}
                        </>
                      )}
                      {s.status === 'running' && (
                        <Tag color="blue" style={{ margin: 0 }}>进行中</Tag>
                      )}
                      {s.status === 'fail' && (
                        <>
                          <Tag color="red" style={{ margin: 0 }}>
                            错误 {s.errorCode}
                          </Tag>
                          <Text type="danger" style={{ fontSize: 12 }}>
                            {s.errorReason}
                          </Text>
                        </>
                      )}
                      {s.status === 'pending' && (
                        <Tag style={{ margin: 0 }}>等待</Tag>
                      )}
                    </Space>
                  ),
                };
              })}
            />
          </Card>
        )}

        {/* 失败诊断 */}
        {localDiagnostics && (
          <Alert
            type="error"
            showIcon
            message={
              <Space wrap>
                <Text strong>失败诊断</Text>
                <Tag color="red">错误码 {localDiagnostics.errorCode}</Tag>
                <Text type="secondary">{STAGE_META[localDiagnostics.failureStage].label}阶段</Text>
              </Space>
            }
            description={
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text>{localDiagnostics.errorReason}</Text>
                <div>
                  <Text strong style={{ fontSize: 13 }}>解决步骤：</Text>
                  <ol style={{ marginTop: 4, paddingLeft: 18, marginBottom: 0 }}>
                    {localDiagnostics.steps.map((s) => (
                      <li key={s.idx} style={{ marginBottom: 4 }}>
                        <Text strong>{s.title}</Text>
                        <Paragraph style={{ margin: 0, fontSize: 12 }} type="secondary">
                          {s.detail}
                        </Paragraph>
                        {s.fieldKey && onLocateField && (
                          <Button
                            type="link"
                            size="small"
                            style={{ padding: 0, height: 'auto' }}
                            onClick={() => onLocateField(s.fieldKey!)}
                          >
                            按建议修改 →
                          </Button>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </Space>
            }
          />
        )}

        {/* PRD §3.3.1:历史方案复用不再在新建注册页新增独立卡片,
            改为由 Agent 对话气泡统一呈现(由 ConnectivityTester 推送 'historical-plan' 消息)
            - 测试失败时:按错误码匹配 Top3 推 'test-fail'
            - 测试通过时:按 matchScore 取 Top3 推 'test-pass'
            - 进入页面时:SmartRegistrationForm 推 'page-init' (Top3) */}
        {/* 通过状态 / 无数据 */}
        {localSteps.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={2}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  点击「测试验证」由医小管自动发起连通性测试
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  · 失败时自动诊断错误码、给出编号化解决步骤
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  · 通过的方案将脱敏沉淀为知识库供后续复用
                </Text>
              </Space>
            }
            style={{ padding: '12px 0' }}
          />
        )}

        {!running && localSteps.length > 0 && failIdx < 0 && okCount === totalSteps && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="测试验证正常"
            description="本次配置已脱敏沉淀至接入中心「历史方案」知识库，可供后续同模式接入复用"
          />
        )}
      </Space>
    </div>
  );
};

export default ConnectivityTester;
