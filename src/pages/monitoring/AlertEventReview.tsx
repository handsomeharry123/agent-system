/**
 * 6.4 处理审核页（V1.8）
 * 需求文档：统一运行监控中心-需求说明文档 V1.8 §6.4
 *
 * 字段：序号 / 事件类型 / 关联智能体 / 触发告警内容 / 触发告警时间 /
 *       处理结果 / 处理方案 / 审核意见（处理完成 / 退回重新处理）/ 审核说明
 * 按钮：处理完成 → 已关闭；退回重新处理 → 待处理
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Card, Space, Typography, Button, Tag, Form, Input, Radio, message, Modal,
  Descriptions,
} from 'antd';
import {
  ArrowLeftOutlined, AuditOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { PermissionDenied } from '../../components/PageStates';
import {
  mockAlertEventsV18, AlertEventStatusLabels, AlertEventStatusColors,
  type AlertEventV18, type AlertEventStatus,
} from '../../mock/monitoringV18';
import { useMonitoringGuard } from './useMonitoringGuard';

const { Text } = Typography;
const { TextArea } = Input;

const AlertEventReview = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useMonitoringGuard();
  const [event, setEvent] = useState<AlertEventV18 | null>(null);
  const [saving, setSaving] = useState(false);
  const [reviewForm] = Form.useForm();

  useEffect(() => {
    if (params.id) {
      const e = mockAlertEventsV18.find((x) => x.id === params.id);
      setEvent(e || null);
    }
  }, [params.id]);

  // 右上角状态标签：从 URL ?tab= 读取当前所属 Tab，与列表 Tab 状态保持一致；
  // 未传 tab 时回落至事件本身的 status
  const displayStatus = useMemo<AlertEventStatus | null>(() => {
    if (!event) return null;
    const tab = searchParams.get('tab') as AlertEventStatus | null;
    if (tab && AlertEventStatusLabels[tab]) return tab;
    return event.status;
  }, [event, searchParams]);

  if (!isAdmin) return <PermissionDenied message="您当前的角色无权访问处理审核页" />;
  if (!event || !displayStatus) return <Text type="secondary">事件不存在</Text>;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // 提交审核（处理完成 / 退回重新处理）
  const submitReview = async () => {
    try {
      const values = await reviewForm.validateFields();
      const isClose = values.reviewOpinion === '处理完成，关闭该告警事项';
      Modal.confirm({
        title: isClose ? '确认处理完成？' : '确认退回重新处理？',
        content: isClose
          ? '审核通过后，事件记录到「已关闭事件」。'
          : '退回后事件将进入「待处理事件」，并展示退回处理的具体说明。',
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          setSaving(true);
          const updated: AlertEventV18 = {
            ...event,
            status: isClose ? 'closed' : 'pending_handle',
            reviewer: '黄帅帅',
            reviewTime: now,
            reviewOpinion: values.reviewOpinion,
            reviewRemark: values.reviewRemark,
            handleTimeline: [
              ...(event.handleTimeline || []),
              {
                time: now,
                action: isClose ? '审核通过' : '退回',
                operator: '黄帅帅',
                remark: `${values.reviewOpinion}：${values.reviewRemark}`,
              },
            ],
            returnReason: isClose ? undefined : values.reviewRemark,
          };
          const idx = mockAlertEventsV18.findIndex((x) => x.id === event.id);
          if (idx >= 0) mockAlertEventsV18[idx] = updated;
          setEvent(updated);
          message.success(isClose ? '审核通过，事件已关闭' : '已退回处理，事件进入「待处理事件」');
          setTimeout(() => {
            navigate(`/app/monitoring/alert-events?tab=${isClose ? 'closed' : 'pending_handle'}`);
          }, 800);
        },
      });
    } catch (e) { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24, background: '#F5F5F5', minHeight: '100vh' }}>
      <PageHeader
        title="处理审核"
        subTitle="审核处理结果：通过 → 已关闭；退回 → 待处理"
        showBack
        onBack={() => navigate('/app/monitoring/alert-events')}
        breadcrumb={[
          { path: '/app/monitoring', breadcrumbName: '统一运行监控中心' },
          { path: '/app/monitoring/alert-events', breadcrumbName: '告警事件处置' },
          { path: '', breadcrumbName: '处理审核' },
        ]}
        extra={
          <Space>
            <Tag color={AlertEventStatusColors[displayStatus]}>{AlertEventStatusLabels[displayStatus]}</Tag>
          </Space>
        }
      />

      <Card bordered={false} style={{ marginTop: 16 }} title="事件基本信息">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="序号">{event.id.slice(-3)}</Descriptions.Item>
          <Descriptions.Item label="事件类型">
            <Tag color={event.eventType === 'business' ? 'blue' : event.eventType === 'status' ? 'green' : event.eventType === 'cost' ? 'orange' : 'red'}>
              {event.eventType === 'business' ? '业务监控' : event.eventType === 'status' ? '状态监控' : event.eventType === 'cost' ? '成本监控' : '安全监控'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="关联智能体">
            <Link to={`/app/ledger/list?agentId=${event.agentId}`}>{event.agentName}</Link>
            <Text type="secondary" style={{ marginLeft: 6 }}>· {event.department}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="处理人">{event.handler || '—'}</Descriptions.Item>
          <Descriptions.Item label="触发告警时间">{event.triggerTime}</Descriptions.Item>
          <Descriptions.Item label="处理完成时间">{event.handleCompleteTime || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card bordered={false} style={{ marginTop: 16 }} title="触发告警内容">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="规则名称">{event.triggerContent.rule_name}</Descriptions.Item>
          <Descriptions.Item label="触发条件">
            {event.triggerContent.trigger_condition.metric} {event.triggerContent.trigger_condition.operator} {event.triggerContent.trigger_condition.threshold}{event.triggerContent.trigger_condition.thresholdUnit}
            （{event.triggerContent.trigger_condition.sustainDuration}）
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card bordered={false} style={{ marginTop: 16 }} title="处理结果与处理方案">
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="处理结果">
            {event.handleResult ? <Tag color={event.handleResult === '已处理' ? 'success' : 'default'}>{event.handleResult}</Tag> : <Text type="secondary">—</Text>}
          </Descriptions.Item>
          <Descriptions.Item label="处理方案">
            {event.handlePlan ? <Text style={{ whiteSpace: 'pre-wrap' }}>{event.handlePlan}</Text> : <Text type="secondary">—</Text>}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card bordered={false} style={{ marginTop: 16 }} title="审核意见与审核说明">
        <Form form={reviewForm} layout="vertical">
          <Form.Item name="reviewOpinion" label="审核意见" rules={[{ required: true, message: '请选择' }]}>
            <Radio.Group>
              <Space size="large">
                <Radio value="处理完成，关闭该告警事项">处理完成，关闭该告警事项</Radio>
                <Radio value="退回重新处理">退回重新处理</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="reviewRemark" label="审核说明" rules={[{ required: true, message: '请填写审核说明' }]}>
            <TextArea rows={4} maxLength={500} showCount placeholder="阐述具体审核说明；退回时务必说明原因，便于处理人理解" />
          </Form.Item>
        </Form>
      </Card>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button onClick={() => navigate('/app/monitoring/alert-events')}>返回</Button>
        <Button type="primary" icon={<AuditOutlined />} onClick={submitReview} loading={saving}>
          提交审核
        </Button>
      </div>
    </div>
  );
};

export default AlertEventReview;