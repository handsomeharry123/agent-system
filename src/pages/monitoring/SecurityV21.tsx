import { useEffect, useState } from 'react';
import { Button, Card, Col, Row, Space, Spin, Tag, Typography } from 'antd';
import { ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import MetricLabel from '../../components/MetricLabel';

const { Text } = Typography;

const metrics = [
  { name: '异常输入攻击成功率', value: '0.18%', status: '关注', color: '#FAAD14', detail: '9 / 5,012 次', note: '提示词注入、越狱指令、恶意代码注入' },
  { name: '输出内容合规率', value: '99.72%', status: '正常', color: '#52C41A', detail: '128,038 / 128,397 条', note: '经内容安全审核判定为合规' },
  { name: '高风险请求拒绝响应率', value: '99.36%', status: '正常', color: '#52C41A', detail: '1,086 / 1,093 次', note: '正确拒绝或转人工处理' },
  { name: '数据信息隐私泄露率', value: '0.00%', status: '安全', color: '#52C41A', detail: '0 / 128,397 条', note: '患者隐私信息全量扫描' },
  { name: '越权工具调用拦截率', value: '100%', status: '安全', color: '#52C41A', detail: '436 / 436 次', note: '跨用户、跨科室越权调用尝试' },
];

const SecurityV21 = () => {
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const refresh = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLastUpdated(new Date());
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div style={{ padding: 24, background: '#F5F5F5', minHeight: '100vh' }}>
      <PageHeader
        title="安全监控"
        subTitle="智能体输入攻击、输出合规、高风险请求、隐私泄露与越权工具调用监控"
        extra={<Space>
          <Tag color="processing">每 60 秒自动刷新</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>更新于 {lastUpdated.toLocaleTimeString('zh-CN', { hour12: false })}</Text>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>刷新</Button>
        </Space>}
      />
      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {metrics.map((metric, index) => (
            <Col key={metric.name} span={index < 2 ? 12 : 8}>
              <Card bordered={false} hoverable styles={{ body: { padding: 20, minHeight: 174 } }}>
                <Space direction="vertical" size={7} style={{ width: '100%' }}>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <MetricLabel name={metric.name} variant="kpi" />
                    <Tag color={metric.color === '#52C41A' ? 'success' : 'warning'}>{metric.status}</Tag>
                  </Space>
                  <Space align="baseline">
                    <SafetyCertificateOutlined style={{ color: metric.color, fontSize: 23 }} />
                    <Text strong style={{ fontSize: 36, color: metric.color }}>{metric.value}</Text>
                  </Space>
                  <Text type="secondary">统计明细：{metric.detail}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{metric.note}</Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
        <Card bordered={false} style={{ marginTop: 16 }} title="安全指标告警策略">
          <Row gutter={24}>
            <Col span={8}><Text>攻击成功率超阈值：</Text><Tag color="error">实时告警</Tag></Col>
            <Col span={8}><Text>隐私泄露：</Text><Tag color="error">触发即 0 容忍告警</Tag></Col>
            <Col span={8}><Text>越权拦截率低于 100%：</Text><Tag color="error">实时告警</Tag></Col>
          </Row>
        </Card>
      </Spin>
    </div>
  );
};

export default SecurityV21;
