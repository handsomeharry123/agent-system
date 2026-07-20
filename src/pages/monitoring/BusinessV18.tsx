/**
 * 2.1 业务监控页（V1.8）
 * 需求文档：统一运行监控中心-需求说明文档 V1.8 §2
 *
 * 字段：
 *  - 智能体累计调用次数（点击进入审计日志）
 *  - 智能体成功调用率（≥95% 绿 / <95% 黄 / <90% 红）
 *  - 当日调用次数（带 ↑↓ 趋势）
 *  - 当日成功调用率（颜色状态）
 *  - 调用次数日/周/月趋势（3 折线）
 *  - 高频调用智能体 TOP5 + 科室排行
 *  - 并发数（实时数值 + 峰值 + 动态波动图）
 *  - 吞吐量（实时数值 + 峰值 + 动态波动图）
 *  - 平均响应时间（性能等级：≤1s 优秀绿 / 1-10s 正常黄 / >10s 异常红）
 *  - 响应超时率（≤1% 绿 / 1-5% 黄 / >5% 红）
 *  - 医生采纳率（% + 趋势图）
 *  - 用户反馈意见（饼图：满意/一般/不满意）
 *
 * 仅 IT 管理员可见；自动刷新 60s + 手动【刷新】
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card, Row, Col, Typography, Space, Button, Spin, Tag,
} from 'antd';
import {
  ReloadOutlined, RiseOutlined, FallOutlined,
} from '@ant-design/icons';
import { Line, Column, Pie, Bar } from '@ant-design/charts';
import PageHeader from '../../components/PageHeader';
import MetricLabel from '../../components/MetricLabel';
import { useAuth } from '../../hooks/useAuth';
import { useSmartDraft } from '../agent-center/smart/store';
import {
  businessKpiV18,
  responseTimeDistV18,
  topCallAgentsV18,
} from '../../mock/monitoringV18';

const { Text } = Typography;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chartBase: any = {
  autoFit: true,
  pixelRatio: window.devicePixelRatio,
  appendPadding: [8, 8, 24, 8],
  xAxis: { label: { autoHide: false, autoRotate: false } },
  legend: { position: 'top', itemName: { style: { fontSize: 11 } } },
};

// 颜色工具
const rateColor = (rate: number, green: number, yellow: number): string => {
  if (rate >= green) return '#52C41A';
  if (rate >= yellow) return '#FAAD14';
  return '#FF4D4F';
};

// KPI 卡片内嵌趋势图统一样式：与 Overview / CostV18 折线图保持一致
const kpiLineConfig: any = {
  smooth: true,
  point: { size: 4, shape: 'circle' },
  area: { style: { fillOpacity: 0.12 } },
  lineStyle: { lineWidth: 2 },
  xAxis: { label: { autoHide: false, autoRotate: false, style: { fontSize: 10 } } },
  yAxis: { label: { style: { fontSize: 10 } } },
  tooltip: { showMarkers: true, shared: true },
  legend: false,
};

// KPI 卡片内嵌柱状图统一样式
const kpiColumnConfig: any = {
  xAxis: { label: { autoHide: false, autoRotate: false, style: { fontSize: 10 } } },
  yAxis: { label: { style: { fontSize: 10 } } },
  tooltip: { showMarkers: true, shared: true },
  legend: false,
};

// 调用次数趋势（近 15 天）
const callTrendDaily = Array.from({ length: 15 }, (_, i) => ({
  date: `06-${(12 + i).toString().padStart(2, '0')}`,
  v: Math.round(10000 + Math.sin(i * 0.5) * 1200 + i * 80),
}));
const callTrendWeekly = Array.from({ length: 15 }, (_, i) => ({
  week: `W${(20 + i).toString().padStart(2, '0')}`,
  v: Math.round(70000 + Math.sin(i * 0.4) * 8000 + i * 400),
}));
const callTrendMonthly = Array.from({ length: 12 }, (_, i) => ({
  month: `${(i + 1).toString().padStart(2, '0')}月`,
  v: Math.round(280000 + Math.sin(i * 0.6) * 40000 + i * 2000),
}));

// 成功率趋势
const successTrendDaily = Array.from({ length: 15 }, (_, i) => ({
  date: `06-${(12 + i).toString().padStart(2, '0')}`,
  v: Number((98.2 + Math.sin(i * 0.4) * 0.6 + i * 0.02).toFixed(2)),
}));

// 采纳率趋势
const adoptionTrendDaily = Array.from({ length: 15 }, (_, i) => ({
  date: `06-${(12 + i).toString().padStart(2, '0')}`,
  v: Number((89 + Math.sin(i * 0.3) * 1.5).toFixed(2)),
}));

// 并发动态波动（每 5 分钟一个点，共 24 个点）
const concurrencyTrend = Array.from({ length: 24 }, (_, i) => ({
  time: `${(i * 1).toString().padStart(2, '0')}:00`,
  v: Math.round(30 + Math.sin(i * 0.5) * 12 + Math.random() * 5),
}));

// 吞吐动态波动
const throughputTrend = Array.from({ length: 24 }, (_, i) => ({
  time: `${(i * 1).toString().padStart(2, '0')}:00`,
  v: Number((10 + Math.sin(i * 0.4) * 5 + Math.random() * 2).toFixed(1)),
}));

const BusinessV18 = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.roles.includes('信息科管理员') ?? false;
  const { pushWelcomeGreeting, consumeWelcome } = useSmartDraft();
  const [loading, setLoading] = useState(false);
  const [autoRefresh] = useState(true);

  // 自动刷新 60s
  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      // eslint-disable-next-line no-console
      console.log('[业务监控] 自动刷新 60s');
    }, 60_000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  const kpi = businessKpiV18;
  const scopedKpi = useMemo(() => {
    if (isAdmin) return kpi;
    const departmentCalls = topCallAgentsV18
      .filter((item) => item.department === currentUser?.department)
      .reduce((sum, item) => sum + item.calls, 0);
    const allRankedCalls = topCallAgentsV18.reduce((sum, item) => sum + item.calls, 0);
    return { ...kpi, totalCalls: departmentCalls, todayCalls: Math.round(kpi.todayCalls * (departmentCalls / allRankedCalls || 0)) };
  }, [currentUser?.department, isAdmin, kpi]);

  useEffect(() => {
    pushWelcomeGreeting('monitoring-business', isAdmin ? 'admin' : 'dept', undefined, {
      windowReplacements: [scopedKpi.totalCalls, scopedKpi.todayCalls, scopedKpi.successRate],
    });
    (window as any).__businessMonitoringContext = {
      scope: isAdmin ? '全院' : '本科室',
      ...scopedKpi,
      topAgents: isAdmin ? topCallAgentsV18 : topCallAgentsV18.filter((item) => item.department === currentUser?.department),
      responseTimeDistribution: responseTimeDistV18.map((item) => `${item.range} ${item.count} 次`).join('、'),
    };
    return () => {
      consumeWelcome();
      delete (window as any).__businessMonitoringContext;
    };
  }, [consumeWelcome, currentUser?.department, isAdmin, pushWelcomeGreeting, scopedKpi]);

  return (
    <div style={{ padding: 24, background: '#F5F5F5', minHeight: '100vh' }}>
      <PageHeader
        title="业务监控"
        subTitle="智能体的调用量、成功率、并发/吞吐、响应时间、超时率、采纳率与用户反馈"
        extra={
          <Space size={8}>
            <Button icon={<ReloadOutlined />} onClick={() => setLoading(true)} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      />

      <Spin spinning={loading}>
        {/* 4 KPI 卡片：累计调用 / 累计成功率 / 当日调用 / 当日成功率 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={6}>
            <Link to="/app/audit">
              <Card hoverable bordered={false} styles={{ body: { padding: 16, height: 110 } }}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <MetricLabel name="智能体累计调用次数" variant="kpi" />
                  <Text strong style={{ fontSize: 32, color: '#1677FF', lineHeight: 1.1 }}>
                    {kpi.totalCalls.toLocaleString()}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>次 · 点击进入审计日志 →</Text>
                </Space>
              </Card>
            </Link>
          </Col>
          <Col span={6}>
            <Card hoverable bordered={false} styles={{ body: { padding: 16, height: 110 } }}>
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <MetricLabel name="智能体成功调用率" variant="kpi" />
                <Space size={6} align="baseline">
                  <Text strong style={{ fontSize: 32, color: rateColor(kpi.successRate, 95, 90), lineHeight: 1.1 }}>
                    {kpi.successRate.toFixed(1)}%
                  </Text>
                  <Tag color={rateColor(kpi.successRate, 95, 90) === '#52C41A' ? 'success' : rateColor(kpi.successRate, 95, 90) === '#FAAD14' ? 'warning' : 'error'}>
                    {kpi.successRate >= 95 ? '优秀' : kpi.successRate >= 90 ? '关注' : '异常'}
                  </Tag>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>累计成功率 · ≥95% 绿 / &lt;95% 黄 / &lt;90% 红</Text>
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable bordered={false} styles={{ body: { padding: 16, height: 110 } }}>
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <MetricLabel name="当日调用次数" variant="kpi" />
                <Space size={6} align="baseline">
                  <Text strong style={{ fontSize: 32, color: '#1677FF', lineHeight: 1.1 }}>
                    {kpi.todayCalls.toLocaleString()}
                  </Text>
                  <Space size={2}>
                    <RiseOutlined style={{ color: '#52C41A', fontSize: 12 }} />
                    <Text type="success" style={{ fontSize: 12 }}>+8.2%</Text>
                  </Space>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>当日 00:00 至今</Text>
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card hoverable bordered={false} styles={{ body: { padding: 16, height: 110 } }}>
              <Space direction="vertical" size={2} style={{ width: '100%' }}>
                <MetricLabel name="当日成功调用率" variant="kpi" />
                <Space size={6} align="baseline">
                  <Text strong style={{ fontSize: 32, color: rateColor(kpi.todaySuccessRate, 95, 90), lineHeight: 1.1 }}>
                    {kpi.todaySuccessRate.toFixed(1)}%
                  </Text>
                  <Space size={2}>
                    <FallOutlined style={{ color: '#52C41A', fontSize: 12 }} />
                    <Text type="success" style={{ fontSize: 12 }}>-0.3%</Text>
                  </Space>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>≥95% 优秀 / &lt;95% 关注 / &lt;90% 异常</Text>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 调用次数 日 / 周 / 月 趋势 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Card bordered={false} title="调用次数日趋势（近 15 天）"
              styles={{ body: { padding: 12, height: 220 } }} style={{ height: 280 }}>
              <Line {...chartBase} height={200} data={callTrendDaily} xField="date" yField="v" smooth color="#1677FF" />
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false} title="调用次数周趋势（近 15 周）"
              styles={{ body: { padding: 12, height: 220 } }} style={{ height: 280 }}>
              <Line {...chartBase} height={200} data={callTrendWeekly} xField="week" yField="v" smooth color="#722ED1" />
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false} title="调用次数月趋势（近 12 月）"
              styles={{ body: { padding: 12, height: 220 } }} style={{ height: 280 }}>
              <Line {...chartBase} height={200} data={callTrendMonthly} xField="month" yField="v" smooth color="#FA8C16" />
            </Card>
          </Col>
        </Row>

        {/* TOP5 + 并发 / 吞吐 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Card bordered={false} title="高频调用智能体 TOP5（含所属科室）"
              styles={{ body: { padding: 12, height: 280 } }} style={{ height: 340 }}>
              <Bar
                {...chartBase}
                height={260}
                data={topCallAgentsV18}
                xField="calls"
                yField="name"
                colorField="department"
                legend={{ position: 'top' }}
                color={['#1677FF', '#722ED1', '#52C41A', '#FA8C16', '#EB2F96']}
                label={{ position: 'right', style: { fill: '#666', fontSize: 11 } }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false} title="并发数（实时数值 + 峰值 + 波动图）"
              styles={{ body: { padding: 12, height: 280 } }} style={{ height: 340 }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space size={16} align="baseline">
                  <Space size={4} align="baseline">
                    <Text type="secondary" style={{ fontSize: 12 }}>当前</Text>
                    <Text strong style={{ fontSize: 28, color: '#1677FF', lineHeight: 1.1 }}>{kpi.concurrency.current}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>路</Text>
                  </Space>
                  <Space size={4} align="baseline">
                    <Text type="secondary" style={{ fontSize: 12 }}>峰值</Text>
                    <Text strong style={{ fontSize: 16, color: '#FA8C16', lineHeight: 1.1 }}>{kpi.concurrency.peak}</Text>
                  </Space>
                </Space>
                <div style={{ height: 200 }}>
                  <Line {...chartBase} height={200} data={concurrencyTrend} xField="time" yField="v" smooth color="#1677FF" />
                </div>
              </Space>
            </Card>
          </Col>
          <Col span={8}>
            <Card bordered={false} title="吞吐量（实时数值 + 峰值 + 波动图）"
              styles={{ body: { padding: 12, height: 280 } }} style={{ height: 340 }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Space size={16} align="baseline">
                  <Space size={4} align="baseline">
                    <Text type="secondary" style={{ fontSize: 12 }}>当前</Text>
                    <Text strong style={{ fontSize: 28, color: '#722ED1', lineHeight: 1.1 }}>{kpi.throughput.current}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{kpi.throughput.unit}</Text>
                  </Space>
                  <Space size={4} align="baseline">
                    <Text type="secondary" style={{ fontSize: 12 }}>峰值</Text>
                    <Text strong style={{ fontSize: 16, color: '#FA8C16', lineHeight: 1.1 }}>{kpi.throughput.peak}</Text>
                  </Space>
                </Space>
                <div style={{ height: 200 }}>
                  <Line {...chartBase} height={200} data={throughputTrend} xField="time" yField="v" smooth color="#722ED1" />
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {/* 响应时间 / 超时率 / 采纳率 / 反馈 */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={6}>
            <Card bordered={false} title={<MetricLabel name="平均响应时间" />}
              styles={{ body: { padding: 16, height: 264 } }} style={{ height: 324 }}>
              <Row align="middle" style={{ marginBottom: 4 }}>
                <Col>
                  <Space size={8} align="baseline">
                    <Text strong style={{ fontSize: 32, color: kpi.avgResponseTime <= 1 ? '#52C41A' : kpi.avgResponseTime <= 10 ? '#FAAD14' : '#FF4D4F', lineHeight: 1.1 }}>
                      {kpi.avgResponseTime.toFixed(2)}
                      <Text type="secondary" style={{ fontSize: 14, marginLeft: 4 }}>s</Text>
                    </Text>
                    <Tag color={kpi.avgResponseTime <= 1 ? 'success' : kpi.avgResponseTime <= 10 ? 'warning' : 'error'} style={{ marginRight: 0 }}>
                      {kpi.avgResponseTime <= 1 ? '优秀' : kpi.avgResponseTime <= 10 ? '正常' : '异常'}
                    </Tag>
                  </Space>
                </Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                ≤1s 优秀 / 1-10s 正常 / &gt;10s 异常 · 响应时间分布
              </Text>
              <div style={{ width: '100%', height: 180 }}>
                <Column
                  {...chartBase}
                  {...kpiColumnConfig}
                  height={180}
                  data={responseTimeDistV18}
                  xField="range"
                  yField="count"
                  color={({ range }: { range: string }) => (range === '>10s' ? '#FF4D4F' : range === '3s-10s' ? '#FAAD14' : '#1677FF')}
                  appendPadding={[4, 4, 4, 4]}
                />
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false} title={<MetricLabel name="响应超时率" />}
              styles={{ body: { padding: 16, height: 264 } }} style={{ height: 324 }}>
              <Row align="middle" style={{ marginBottom: 4 }}>
                <Col>
                  <Space size={8} align="baseline">
                    <Text strong style={{ fontSize: 32, color: kpi.timeoutRate <= 1 ? '#52C41A' : kpi.timeoutRate <= 5 ? '#FAAD14' : '#FF4D4F', lineHeight: 1.1 }}>
                      {kpi.timeoutRate.toFixed(1)}%
                    </Text>
                    <Tag color={kpi.timeoutRate <= 1 ? 'success' : kpi.timeoutRate <= 5 ? 'warning' : 'error'} style={{ marginRight: 0 }}>
                      {kpi.timeoutRate <= 1 ? '正常' : kpi.timeoutRate <= 5 ? '关注' : '异常'}
                    </Tag>
                  </Space>
                </Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                阈值 10s · ≤1% 绿 / 1-5% 黄 / &gt;5% 红 · 24 小时趋势
              </Text>
              <div style={{ width: '100%', height: 180 }}>
                <Line
                  {...chartBase}
                  {...kpiLineConfig}
                  height={180}
                  data={Array.from({ length: 24 }, (_, i) => ({ time: `${i}:00`, v: Number((2 + Math.sin(i * 0.3) * 1.5).toFixed(2)) }))}
                  xField="time" yField="v" color="#FA8C16"
                  appendPadding={[4, 4, 4, 4]}
                />
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false} title={<MetricLabel name="医生采纳率" />}
              styles={{ body: { padding: 16, height: 264 } }} style={{ height: 324 }}>
              <Row align="middle" style={{ marginBottom: 4 }}>
                <Col>
                  <Space size={8} align="baseline">
                    <Text strong style={{ fontSize: 32, color: '#52C41A', lineHeight: 1.1 }}>
                      {kpi.adoptionRate.toFixed(1)}%
                    </Text>
                  </Space>
                </Col>
              </Row>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                被医生采纳输出 / 总输出次数 · 近 15 日趋势
              </Text>
              <div style={{ width: '100%', height: 180 }}>
                <Line
                  {...chartBase}
                  {...kpiLineConfig}
                  height={180}
                  data={adoptionTrendDaily}
                  xField="date" yField="v" color="#52C41A"
                  appendPadding={[4, 4, 4, 4]}
                />
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false} title={<MetricLabel name="用户反馈意见" />}
              styles={{ body: { padding: 16, height: 264 } }} style={{ height: 324 }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                满意 78% / 一般 16% / 不满意 6% · 反馈详情列表 →
              </Text>
              <div style={{ width: '100%', height: 210 }}>
                <Pie
                  {...chartBase}
                  height={210}
                  data={[
                    { type: '满意', value: kpi.feedback.满意 },
                    { type: '一般', value: kpi.feedback.一般 },
                    { type: '不满意', value: kpi.feedback.不满意 },
                  ]}
                  angleField="value" colorField="type" radius={0.85} innerRadius={0.55}
                  color={['#52C41A', '#FAAD14', '#FF4D4F']} legend={{ position: 'bottom' }}
                  appendPadding={[4, 4, 4, 4]}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default BusinessV18;
