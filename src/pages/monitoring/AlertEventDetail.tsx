/**
 * 6.5 事件详情页（V1.8）
 * 需求文档：统一运行监控中心-需求说明文档 V1.8 §6.5
 *
 * 字段：
 *  - 序号
 *  - 事件类型
 *  - 关联智能体
 *  - 触发告警内容（统一结构）
 *  - 触发告警时间
 *  - 处理结果（已处理 / 已忽略）
 *  - 处理方案
 *  - 审核意见（处理完成 / 退回重新处理）
 *  - 审核说明
 *  - 智能体告警关联拓扑图（触发方 → 所属科室 → 通知对象）
 *
 * 按钮：返回
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Card, Space, Typography, Button, Tag, Descriptions,
} from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import {
  mockAlertEventsV18, AlertEventStatusLabels, AlertEventStatusColors,
  NotifyChannelLabels, type AlertEventV18,
} from '../../mock/monitoringV18';
import { useMonitoringGuard } from './useMonitoringGuard';

const { Text } = Typography;

// V2.0 详情页必填字段空态：处理结果/处理方案在已走过处理流程的状态下必须非空
//   · 用红色 ⚠ 提示比纯「—」更醒目,避免误以为有数据
const EmptyState = ({ message }: { message: string }) => (
  <Space size={4} align="center">
    <ExclamationCircleOutlined style={{ color: '#FF4D4F' }} />
    <Text type="danger" style={{ fontSize: 13 }}>{message}</Text>
  </Space>
);

const AlertEventDetail = () => {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const { isAdmin, currentUserName } = useMonitoringGuard();
  const [event, setEvent] = useState<AlertEventV18 | null>(null);

  useEffect(() => {
    if (params.id) {
      const e = mockAlertEventsV18.find((x) => x.id === params.id);
      setEvent(e || null);
    }
  }, [params.id]);

  // 访问条件：信息科管理员全开；科室管理员仅当本人是处理人时可查看详情
  if (event && !isAdmin && event.handler !== currentUserName) {
    return <Text type="secondary">该事件非您处理，无权查看</Text>;
  }
  if (!event) return <Text type="secondary">事件不存在</Text>;

  return (
    <div style={{ padding: 24, background: '#F5F5F5', minHeight: '100vh' }}>
      <PageHeader
        title="事件详情"
        subTitle="查看事件全量信息、审核意见与智能体告警关联拓扑图"
        showBack
        onBack={() => navigate('/app/monitoring/alert-events')}
        breadcrumb={[
          { path: '/app/monitoring', breadcrumbName: '统一运行监控中心' },
          { path: '/app/monitoring/alert-events', breadcrumbName: '告警事件处置' },
          { path: '', breadcrumbName: '事件详情' },
        ]}
        extra={
          <Space>
            <Tag color={AlertEventStatusColors[event.status]}>{AlertEventStatusLabels[event.status]}</Tag>
            <Button icon={<ReloadOutlined />}>刷新</Button>
          </Space>
        }
      />

      <Card bordered={false} style={{ marginTop: 16 }} title="事件基本信息">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="序号">按触发时间排序</Descriptions.Item>
          <Descriptions.Item label="事件类型">
            <Tag color={event.eventType === 'business' ? 'blue' : event.eventType === 'status' ? 'green' : event.eventType === 'cost' ? 'orange' : 'red'}>
              {event.eventType === 'business' ? '业务监控' : event.eventType === 'status' ? '状态监控' : event.eventType === 'cost' ? '成本监控' : '安全监控'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="关联智能体">
            <Link to={`/app/ledger/list?agentId=${event.agentId}`}>{event.agentName}</Link>
            <Text type="secondary" style={{ marginLeft: 6 }}>· {event.department}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="当前状态">
            <Tag color={AlertEventStatusColors[event.status]}>{AlertEventStatusLabels[event.status]}</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card bordered={false} style={{ marginTop: 16 }} title="触发告警内容">
        <Card size="small" style={{ background: '#F0F5FF', borderColor: '#ADC6FF' }}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label={<Text strong>规则名称</Text>}>
              {event.triggerContent.rule_name}
            </Descriptions.Item>
            <Descriptions.Item label={<Text strong>触发时间</Text>}>
              {event.triggerContent.trigger_time}
            </Descriptions.Item>
            <Descriptions.Item label={<Text strong>触发条件</Text>}>
              <Space direction="vertical" size={2}>
                <Space><Text type="secondary">指标：</Text><Text code>{event.triggerContent.trigger_condition.metric}</Text></Space>
                <Space><Text type="secondary">运算符：</Text><Text code>{event.triggerContent.trigger_condition.operator}</Text></Space>
                <Space><Text type="secondary">阈值：</Text><Text code>{event.triggerContent.trigger_condition.threshold}{event.triggerContent.trigger_condition.thresholdUnit}</Text></Space>
                <Space><Text type="secondary">持续时间：</Text><Text code>{event.triggerContent.trigger_condition.sustainDuration}</Text></Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  示例：{event.triggerContent.trigger_condition.description}
                </Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label={<Text strong>触发动作</Text>}>
              <Tag color="processing">{event.triggerContent.trigger_action}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<Text strong>输出提示词</Text>}>
              <Text style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{event.triggerContent.output_prompt}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      </Card>

      <Card bordered={false} style={{ marginTop: 16 }} title="触发告警时间">
        <Text>{event.triggerTime}</Text>
      </Card>

      <Card bordered={false} style={{ marginTop: 16 }} title="处理结果">
        {event.handleResult ? (
          <Tag color={event.handleResult === '已处理' ? 'success' : 'default'}>{event.handleResult}</Tag>
        ) : <EmptyState message="处理结果不能为空" />}
      </Card>

      <Card bordered={false} style={{ marginTop: 16 }} title="处理方案">
        {event.handlePlan ? (
          <Text style={{ whiteSpace: 'pre-wrap' }}>{event.handlePlan}</Text>
        ) : <EmptyState message="处理方案不能为空" />}
      </Card>

      <Card bordered={false} style={{ marginTop: 16 }} title="审核意见">
        {event.reviewOpinion ? (
          <Tag color={event.reviewOpinion === '处理完成，关闭该告警事项' ? 'success' : 'warning'}>{event.reviewOpinion}</Tag>
        ) : <Text type="secondary">—</Text>}
      </Card>

      <Card bordered={false} style={{ marginTop: 16 }} title="审核说明">
        {event.reviewRemark ? (
          <Text style={{ whiteSpace: 'pre-wrap' }}>{event.reviewRemark}</Text>
        ) : <Text type="secondary">—</Text>}
      </Card>

      <Card bordered={false} style={{ marginTop: 16 }} title="智能体告警关联拓扑图">
        <Card size="small" style={{ background: '#FAFAFA' }}>
          <Space size={32} align="center" style={{ width: '100%', justifyContent: 'center', padding: '32px 0' }} wrap>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 100, height: 70, borderRadius: 8, border: '2px solid #FF4D4F',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#FFF1F0',
              }}>
                <Text strong style={{ fontSize: 12, color: '#FF4D4F' }}>{event.agentName.slice(0, 8)}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>{event.agentName}</Text>
              <br />
              <Tag color="red" style={{ marginTop: 4 }}>触发方</Tag>
            </div>
            <div style={{ fontSize: 28, color: '#8c8c8c' }}>──→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 100, height: 70, borderRadius: 8, border: '2px solid #1677FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#E6F4FF',
              }}>
                <Text strong style={{ fontSize: 12, color: '#1677FF' }}>{event.department}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>所属科室</Text>
              <br />
              <Tag color="blue" style={{ marginTop: 4 }}>归属</Tag>
            </div>
            <div style={{ fontSize: 28, color: '#8c8c8c' }}>──→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 100, height: 70, borderRadius: 8, border: '2px solid #52C41A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#F6FFED',
              }}>
                <Text strong style={{ fontSize: 12, color: '#52C41A' }}>{event.notifyTarget.owner}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>技术负责人</Text>
              <br />
              <Tag color="green" style={{ marginTop: 4 }}>通知对象</Tag>
            </div>
          </Space>
          <Space wrap style={{ marginTop: 16, justifyContent: 'center', width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>通知方式：</Text>
            {event.notifyChannels.map((c) => <Tag key={c} color="blue">{NotifyChannelLabels[c]}</Tag>)}
          </Space>
        </Card>
      </Card>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" onClick={() => navigate('/app/monitoring/alert-events')}>返回</Button>
      </div>
    </div>
  );
};

export default AlertEventDetail;