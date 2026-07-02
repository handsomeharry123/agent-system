/**
 * 智能体接入中心 - 注册信息详情（独立下转页）
 *
 * V2.2：从原 Drawer 转为下转页面，给备案材料 / 基本信息 / 技术信息 / 审核说明 / 审核时间线 充足空间。
 * V2.3：PRD §3.4.1.2 — 删除嵌入式「接入进度 · 核心指标」卡片, 改为由 Agent 对话窗口呈现。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  message,
  Modal,
  Row,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import {
  DownloadOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { useAccessRecords } from './store';
import { useSmartDraft } from './smart/store.tsx';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_ADMIN } from './types';
import type { InsightProgress, ProgressPhase } from './smart/types';

const { Text, Paragraph } = Typography;

const Detail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const records = useAccessRecords();
  const record = records.find((r) => r.id === id);

  const [showSecret, setShowSecret] = useState(false);

  const { pushWelcomeGreeting, addTaggedMessage, removeMessagesByTag } = useSmartDraft();
  const { currentUser } = useAuth();
  const isPlatformAdmin = currentUser?.roles[0] === ROLE_ADMIN;

  // PRD §3.4.1.2 — 接入进度 + 核心指标改为对话窗口呈现(详情页不嵌入卡片)
  // 在 early-return 之前派生, 避免 hooks 顺序不一致
  const insightProgress: InsightProgress | null = useMemo(() => {
    if (!record) return null;
    const phase: ProgressPhase =
      record.status === '审核通过'
        ? 'success'
        : record.status === '审核中'
          ? 'reviewing'
          : 'pending';
    const metrics: InsightProgress['metrics'] = [
      { label: '接入状态', value: record.status, tone: phase === 'success' ? 'success' : 'info' },
      {
        label: '提交时间',
        value: record.submitTime ? record.submitTime.slice(0, 10) : '--',
        tone: 'info',
      },
      {
        label: '距通过',
        value:
          record.status === '审核通过'
            ? '已完成'
            : phase === 'reviewing'
              ? '审核中'
              : '未开始',
        tone: phase === 'success' ? 'success' : 'warning',
      },
    ];
    if (record.status === '审核通过') {
      metrics.push({
        label: '调用次数（今日）',
        value: `${Math.floor(Math.random() * 80 + 20)} 次`,
        tone: 'success',
      });
    }
    const nextActions: InsightProgress['nextActions'] =
      record.status === '审核通过'
        ? [
            {
              key: 'ledger',
              label: '完善台账',
              description: '一键直达统一台账中心补全指标',
              path: `/app/ledger/list?search=${encodeURIComponent(record.name)}&openDetail=1`,
              enabled: true,
            },
            {
              key: 'eval',
              label: '发起准入评测',
              description: '进入评测沙盒新建评测任务',
              path: `/app/evaluation/tasks/create?agentName=${encodeURIComponent(record.name)}`,
              enabled: isPlatformAdmin,
            },
            {
              key: 'monitor',
              label: '查看监控告警',
              description: '查看该智能体的运行时告警',
              path: `/app/monitoring/alerts?agentName=${encodeURIComponent(record.name)}`,
              enabled: true,
            },
          ]
        : record.status === '退回修改'
          ? [
              {
                key: 'edit',
                label: '编辑修改',
                description: '点开退回说明的字段并按建议修改',
                path: `/app/agent-center/edit/${record.agentCode || record.name}`,
                enabled: true,
              },
            ]
          : [];
    return {
      agentName: record.name,
      agentCode: record.agentCode,
      phase,
      metrics,
      nextActions,
    };
  }, [record, isPlatformAdmin]);

  // PRD §3.1.1 欢迎语：注册信息详情页 — 提供方 / 管理方文案一致,统一走 provider
  //   只读页气泡直接操作：【返回列表】+【查看附件】(滚动到备案材料 Card,无附件时置灰)
  useEffect(() => {
    pushWelcomeGreeting('agent-center-detail', 'provider', undefined, {
      actions: [
        { key: 'back', label: '← 返回列表', path: '/app/agent-center', enabled: true },
        {
          key: 'attachments',
          label: '查看附件',
          event: 'agent-detail-scroll-attachments',
          enabled: !!record && record.attachments.length > 0,
          reason: '该记录暂无备案材料',
        },
      ],
    });
  }, [pushWelcomeGreeting, record]);

  // 气泡「查看附件」→ 滚动到备案材料 Card
  useEffect(() => {
    const onScroll = () => {
      document
        .querySelector('[data-testid="detail-attachments-card"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener('agent-detail-scroll-attachments', onScroll);
    return () => window.removeEventListener('agent-detail-scroll-attachments', onScroll);
  }, []);

  // PRD §3.4.1.2 — 进入详情页时, 把本条记录的进度 + 指标推到对话窗口呈现
  // 同一记录(record.id)重复进入不重复推; 切换记录时清掉上一条再推新的一条
  useEffect(() => {
    if (!insightProgress || !record) return;
    const tag = `__insight__:${record.id}`;
    addTaggedMessage(tag, {
      role: 'agent',
      type: 'insight-detail',
      content: `本条记录「${insightProgress.agentName}」当前接入进度与核心服务指标如下，可点击下方按钮一键直达。`,
      payload: { insightProgress },
    });
    // 卸载 / record 切换时清掉本条 insight 气泡, 避免切换记录后窗口堆两条
    return () => {
      removeMessagesByTag(tag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insightProgress, addTaggedMessage, removeMessagesByTag]);

  if (!record) {
    return (
      <>
        <PageHeader title="注册信息详情" subTitle="未找到对应的注册记录" showBack onBack={() => navigate(-1)} />
        <Card>
          <Empty description="该记录不存在或已被删除" />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`注册信息详情：${record.name}`}
        subTitle={`注册编号 ${record.agentCode || '--'} · ${record.department} · ${record.applicant}`}
        showBack
        onBack={() => navigate('/app/agent-center')}
        breadcrumb={[
          { path: '/app/agent-center', breadcrumbName: '智能体接入中心' },
          { path: '/app/agent-center', breadcrumbName: '注册管理' },
          { path: id ? `/app/agent-center/detail/${id}` : '', breadcrumbName: '详情' },
        ]}
      />

      <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 12 }}>
        <div data-testid="detail-attachments-card">
        <Card title="备案材料" size="small">
          {record.attachments.length === 0 && <Empty description="无备案材料" />}
          {record.attachments.map((a, i) => (
            <Row key={i} gutter={8} align="middle" style={{ padding: '6px 0' }}>
              <Col flex="auto">
                <Space>
                  <FilePdfOutlined style={{ color: '#d4380d' }} />
                  <Text>附件 {i + 1}：{a.name}</Text>
                  <Text type="secondary">（{a.size}）</Text>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => {
                      Modal.info({
                        title: `预览：${a.name}`,
                        width: 720,
                        content: (
                          <div style={{ marginTop: 8 }}>
                            <div
                              style={{
                                background: '#fafafa',
                                border: '1px solid #f0f0f0',
                                borderRadius: 4,
                                padding: '40px 24px',
                                textAlign: 'center',
                                color: '#999',
                              }}
                            >
                              <FilePdfOutlined style={{ fontSize: 36, color: '#d4380d' }} />
                              <div style={{ marginTop: 8 }}>{a.name}</div>
                              <div style={{ marginTop: 4, fontSize: 12 }}>
                                （{a.size}）演示文件仅展示元信息
                              </div>
                            </div>
                          </div>
                        ),
                      });
                    }}
                  >
                    在线预览
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => message.success(`已下载 ${a.name}`)}
                  >
                    下载
                  </Button>
                </Space>
              </Col>
            </Row>
          ))}
        </Card>
        </div>

        <Card title="基本信息" size="small">
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="智能体名称">{record.name}</Descriptions.Item>
            <Descriptions.Item label="智能体编号">{record.agentCode || '--'}</Descriptions.Item>
            <Descriptions.Item label="所属科室">{record.department}</Descriptions.Item>
            <Descriptions.Item label="诊疗环节">{record.clinicalStage}</Descriptions.Item>
            <Descriptions.Item label="智能体来源">{record.source}</Descriptions.Item>
            <Descriptions.Item label="供应商名称">
              {record.source === '自研' ? '--' : record.supplier}
            </Descriptions.Item>
            <Descriptions.Item label="技术联系人">{record.contactName}</Descriptions.Item>
            <Descriptions.Item label="联系方式">{record.contactPhone}</Descriptions.Item>
            <Descriptions.Item label="智能体类型">{record.type}</Descriptions.Item>
            <Descriptions.Item label="智能体版本">{record.version}</Descriptions.Item>
            <Descriptions.Item label="功能描述" span={2}>
              <Paragraph style={{ marginBottom: 0 }}>{record.description}</Paragraph>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="技术信息" size="small">
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="接入方式">
              <Tag
                color={
                  record.accessMode === 'API'
                    ? 'blue'
                    : record.accessMode === 'SDK'
                      ? 'cyan'
                      : 'purple'
                }
              >
                {record.accessMode} 接入
              </Tag>
            </Descriptions.Item>
            {record.accessMode === 'API' && (
              <>
                <Descriptions.Item label="接口地址">
                  <Text copyable>{record.apiEndpoint}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="API key">
                  <Space>
                    <Text code>
                      {showSecret
                        ? record.apiKey
                        : (record.apiKey || '').replace(/(?<=.{4}).(?=.{4})/g, '*')}
                    </Text>
                    <Button
                      type="text"
                      size="small"
                      icon={showSecret ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      onClick={() => setShowSecret((s) => !s)}
                    >
                      {showSecret ? '隐藏' : '显示'}
                    </Button>
                  </Space>
                </Descriptions.Item>
              </>
            )}
            {(record.accessMode === 'SDK' || record.accessMode === 'OTel') && (
              <>
                <Descriptions.Item label="平台 URL 地址">
                  <Text copyable>{record.platformUrl}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="平台密钥 key">
                  <Space>
                    <Text code>{showSecret ? record.platformKey : 'sk-****'}</Text>
                    <Button
                      type="text"
                      size="small"
                      icon={showSecret ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      onClick={() => setShowSecret((s) => !s)}
                    >
                      {showSecret ? '隐藏' : '显示'}
                    </Button>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="埋点代码">
                  <pre style={{ background: '#fafafa', padding: 8, borderRadius: 4, margin: 0 }}>
                    {`// ${record.accessMode} 埋点代码片段（点击复制后嵌入智能体应用）\nimport { init } from '@platform/agent-${record.accessMode.toLowerCase()}';\ninit({ endpoint: '${record.platformUrl}', key: '${record.platformKey}' });`}
                  </pre>
                </Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="测试验证">
              {record.connectionTested ? (
                <Tag color={record.connectionStatus === 'success' ? 'green' : 'red'}>
                  {record.connectionStatus === 'success' ? '联通成功' : '联通失败'}
                </Tag>
              ) : (
                <Text type="secondary">未测试</Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {(record.returnReason || record.passNote) && (
          <Card title="审核说明" size="small">
            {record.returnReason && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 8 }}
                message="退回修改"
                description={record.returnReason}
              />
            )}
            {record.passNote && (
              <Alert
                type="success"
                showIcon
                message="审核通过意见"
                description={record.passNote}
              />
            )}
          </Card>
        )}

        {/* §3.4.1.2 PRD：接入进度 + 核心指标 + 一键直达 不再在详情页嵌入卡片,
            改为由 Agent 对话窗口呈现(详见 useEffect → addMessage('insight-detail')) */}

        <Card title="审核时间线" size="small">
          {record.auditHistory.length === 0 ? (
            <Empty description="暂无审核记录" />
          ) : (
            <Timeline
              items={record.auditHistory.map((n) => ({
                color:
                  n.status === 'finish'
                    ? 'green'
                    : n.status === 'error'
                      ? 'red'
                      : n.status === 'process'
                        ? 'blue'
                        : 'gray',
                children: (
                  <Space direction="vertical" size={2}>
                    <Text strong>{n.label}</Text>
                    <Text type="secondary">
                      {n.time} {n.operator ? `· ${n.operator}` : ''}
                    </Text>
                    {n.desc && <Text>{n.desc}</Text>}
                  </Space>
                ),
              }))}
            />
          )}
        </Card>
      </Space>
    </>
  );
};

export default Detail;
