import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Space,
  Switch,
  Typography,
  Badge,
  Tooltip,
  DatePicker,
  message,
} from 'antd';
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  ReloadOutlined,
  RobotOutlined,
  AlertOutlined,
  LineChartOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FundOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  Line,
  Pie,
  Radar,
  Bar,
  Column,
} from '@ant-design/charts';
import dayjs, { Dayjs } from 'dayjs';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Config = any;
import PageHeader from '../../components/PageHeader';
import { departmentOptions } from '../../mock/departments';
import { mockAgents } from '../../mock';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// 筛选 - 时间范围（需求 2-2：今日 / 近 7 天 / 近 30 天 / 自定义）
const timeRangeOptions = [
  { label: '今日', value: 'today' },
  { label: '近 7 天', value: 'week' },
  { label: '近 30 天', value: 'month' },
  { label: '自定义', value: 'custom' },
];

// ====================== Mock 数据 ======================

// 调用量趋势（近 7 天）
const mockCallVolumeData = [
  { date: '05-28', value: 9420 },
  { date: '05-29', value: 10210 },
  { date: '05-30', value: 11680 },
  { date: '05-31', value: 12100 },
  { date: '06-01', value: 11960 },
  { date: '06-02', value: 12640 },
  { date: '06-03', value: 12856 },
];

// 评测通过率趋势（近 30 天）
const mockEvalTrendData = (() => {
  const out: { date: string; passRate: number }[] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const d = dayjs().subtract(i, 'day');
    out.push({
      date: d.format('MM-DD'),
      passRate: Math.round((90 + Math.sin(i / 3) * 3 + (i % 5)) * 10) / 10,
    });
  }
  return out;
})();

// 科室使用排行 Top 10
const mockDeptRankingData = [
  { dept: '心内科', calls: 2350 },
  { dept: '急诊科', calls: 2180 },
  { dept: '影像科', calls: 1920 },
  { dept: '药剂科', calls: 1650 },
  { dept: '呼吸科', calls: 1480 },
  { dept: '消化科', calls: 1320 },
  { dept: '神经内科', calls: 1100 },
  { dept: '内分泌科', calls: 980 },
  { dept: '肾内科', calls: 850 },
  { dept: '血液科', calls: 720 },
];

// 智能体类型分布（<5% 已合并到"其他"）
const mockAgentTypeData = [
  { type: '辅助诊断', value: 14 },
  { type: '影像分析', value: 10 },
  { type: '用药审核', value: 7 },
  { type: '病历生成', value: 5 },
  { type: '导诊分诊', value: 4 },
  { type: '其他', value: 3 },
];

// 安全风险 6 维：数据 / 模型 / 接口 / 合规 / 权限 / 审计
const mockRiskRadarData = [
  { dimension: '数据安全', value: 92 },
  { dimension: '模型安全', value: 86 },
  { dimension: '接口安全', value: 88 },
  { dimension: '合规', value: 95 },
  { dimension: '权限', value: 90 },
  { dimension: '审计', value: 87 },
];

// 响应时长分布（<1s / 1-3s / 3-5s / >5s）
const mockResponseTimeData = [
  { range: '<1s', count: 8650 },
  { range: '1-3s', count: 3120 },
  { range: '3-5s', count: 820 },
  { range: '>5s', count: 266 },
];

// ====================== 通用：图表卡 ======================

const ChartCard = ({
  title,
  extra,
  children,
  height = 360,
}: {
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  height?: number;
}) => (
  <Card
    bordered={false}
    title={
      <Text strong style={{ fontSize: 14 }}>
        {title}
      </Text>
    }
    extra={extra}
    style={{ height, overflow: 'hidden' }}
    styles={{ body: { height: height - 56, padding: 12 } }}
  >
    <div style={{ height: '100%', overflow: 'hidden' }}>{children}</div>
  </Card>
);

// ====================== 通用：统计卡 ======================

interface StatCardProps {
  title: string;
  value: number | string;
  suffix?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  subText?: React.ReactNode;
  onClick?: () => void;
  innerChart?: React.ReactNode;
}

const StatCard = ({
  title,
  value,
  suffix,
  icon,
  color,
  trend,
  subText,
  onClick,
  innerChart,
}: StatCardProps) => (
  <Card
    hoverable={!!onClick}
    onClick={onClick}
    bordered={false}
    style={{ height: 110, overflow: 'hidden' }}
    styles={{ body: { height: '100%', padding: 12 } }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: `${color}15`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <Tooltip title={title}>
          <Text
            type="secondary"
            style={{
              fontSize: 12,
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </Text>
        </Tooltip>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
          <span style={{ color, fontSize: 24, fontWeight: 600, lineHeight: 1.2 }}>
            {value}
            {suffix && <span style={{ fontSize: 14, marginLeft: 2 }}>{suffix}</span>}
          </span>
          {trend !== undefined && (
            <Text style={{ fontSize: 11, color: trend >= 0 ? '#52C41A' : '#FF4D4F', flexShrink: 0 }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </Text>
          )}
        </div>
        {subText && (
          <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }} ellipsis>
            {subText}
          </Text>
        )}
      </div>
      {innerChart && <div style={{ width: 64, height: 64, flexShrink: 0 }}>{innerChart}</div>}
    </div>
  </Card>
);

// ====================== 状态分布环形微图 ======================
const StatusDonut = ({
  online,
  offline,
  abnormal,
}: {
  online: number;
  offline: number;
  abnormal: number;
}) => {
  const data = [
    { type: '在线', value: online },
    { type: '离线', value: offline },
    { type: '异常', value: abnormal },
  ];
  const config: Config = {
    data,
    angleField: 'value',
    colorField: 'type',
    radius: 0.9,
    innerRadius: 0.65,
    legend: false,
    label: false,
    color: ['#52C41A', '#D9D9D9', '#FF4D4F'],
    height: 64,
    width: 64,
    animation: false,
  };
  return <Pie {...config} />;
};

// ====================== 主组件 ======================

const Dashboard = () => {
  const navigate = useNavigate();

  const [timeRange, setTimeRange] = useState('today');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // ESC 退出全屏
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // 自动刷新 5 分钟（需求 2-2：Toggle 开启后每 5 分钟自动刷新；全屏强制开启）
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => message.info('数据已自动刷新'), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // 进入全屏：强制开启自动刷新 + 隐藏侧边/顶部 + body 不可滚动
  useEffect(() => {
    if (isFullscreen) {
      setAutoRefresh(true);
      setCarouselIndex(0);
      document.body.style.overflow = 'hidden';
      document.body.setAttribute('data-dashboard-fullscreen', 'true');
    } else {
      document.body.style.overflow = '';
      document.body.removeAttribute('data-dashboard-fullscreen');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.removeAttribute('data-dashboard-fullscreen');
    };
  }, [isFullscreen]);

  // 全屏 10 秒自动轮播（需求 2-2）
  useEffect(() => {
    if (isFullscreen) {
      const t = setInterval(() => setCarouselIndex((p) => (p + 1) % 3), 10 * 1000);
      return () => clearInterval(t);
    }
  }, [isFullscreen]);

  // 统计
  const stats = useMemo(() => {
    const total = mockAgents.length;
    const online = mockAgents.filter((a) => a.runStatus === '在线').length;
    const abnormal = mockAgents.filter((a) => a.runStatus === '异常').length;
    const offline = Math.max(total - online - abnormal, 0);
    return {
      total,
      online,
      offline,
      abnormal,
      pendingAlerts: 3,
      todayCalls: 12856,
      todayCallsTrend: 12.5,
      newThisMonth: 4,
      passRate: 94.2,
      passRateTrend: 2.5,
      monthCost: 89500,
      monthCostTrend: -5.3,
    };
  }, []);

  // ====================== 图表配置 ======================

  const callVolumeConfig: Config = {
    data: mockCallVolumeData,
    xField: 'date',
    yField: 'value',
    smooth: true,
    color: '#1677FF',
    point: { size: 4, shape: 'circle' },
    area: { style: { fill: 'l(270) 0:#1677FF00 1:#1677FF33' } },
    yAxis: { label: { formatter: (v: number) => `${(v / 1000).toFixed(0)}k` } },
    height: 300,
  };

  const evalTrendConfig: Config = {
    data: mockEvalTrendData,
    xField: 'date',
    yField: 'passRate',
    smooth: true,
    color: '#722ED1',
    point: { size: 3 },
    yAxis: { min: 80, max: 100, label: { formatter: (v: number) => `${v}%` } },
    height: 300,
  };

  // 科室 Top10 横向柱状图：Y 轴科室；右侧显示 `12,856 (18.5%)`；按调用量降序；渐变色
  const deptBarConfig: Config = {
    data: mockDeptRankingData,
    xField: 'calls',
    yField: 'dept',
    colorField: 'dept',
    color: ({ calls }: { calls: number }) => {
      const max = Math.max(...mockDeptRankingData.map((d) => d.calls));
      const ratio = calls / max;
      const r = Math.round(22 + (145 - 22) * (1 - ratio));
      const g = Math.round(119 + (213 - 119) * (1 - ratio));
      const b = 255;
      return `rgb(${r}, ${g}, ${b})`;
    },
    label: {
      position: 'right',
      formatter: (datum: { calls: number }) => {
        const total = mockDeptRankingData.reduce((s, d) => s + d.calls, 0);
        const pct = ((datum.calls / total) * 100).toFixed(1);
        return `${datum.calls.toLocaleString()} (${pct}%)`;
      },
      style: { fontSize: 12, fill: 'rgba(0,0,0,0.65)' },
    },
    xAxis: false,
    legend: false,
    height: 360,
    barWidthRatio: 0.7,
  };

  // 饼图：外侧标签 + 引导线
  const typePieConfig: Config = {
    data: mockAgentTypeData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.9,
    label: {
      type: 'spider',
      style: { fontSize: 12 },
      formatter: (datum: { type: string; value: number }) => {
        const total = mockAgentTypeData.reduce((s, d) => s + d.value, 0);
        const pct = ((datum.value / total) * 100).toFixed(0);
        return `${datum.type} ${datum.value} 个 (${pct}%)`;
      },
    },
    legend: { position: 'right' as const },
    color: ['#1677FF', '#52C41A', '#FA8C16', '#722ED1', '#13C2C2', '#A0D911'],
    height: 300,
  };

  const radarConfig: Config = {
    data: mockRiskRadarData,
    xField: 'dimension',
    yField: 'value',
    color: '#1677FF',
    area: { style: { fill: '#1677FF33' } },
    yAxis: { min: 0, max: 100 },
    height: 300,
  };

  const responseTimeConfig: Config = {
    data: mockResponseTimeData,
    xField: 'range',
    yField: 'count',
    color: '#1677FF',
    label: { position: 'top' as const, style: { fontSize: 12 } },
    columnWidthRatio: 0.5,
    height: 300,
  };

  // ====================== 6 卡 1 行 6 列（响应式 3+3 / 2） ======================
  // 需求 2-2：6 卡片 1 行 6 列（>=1280 span=4）；视口 <1280 → 1 行 3 列 ×2；<768 → 1 行 2 列
  const statCardColProps = { xs: 12, sm: 12, md: 8, lg: 8, xl: 4, xxl: 4 };

  const renderStatCards = () => (
    <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
      <Col {...statCardColProps}>
        <StatCard
          title="待处理告警"
          value={stats.pendingAlerts}
          suffix="条"
          icon={<AlertOutlined />}
          color="#FF4D4F"
          subText="需立即处理"
          onClick={() => navigate('/app/monitoring')}
        />
      </Col>
      <Col {...statCardColProps}>
        <StatCard
          title="在线 / 离线 / 异常"
          value={`${stats.online} / ${stats.offline} / ${stats.abnormal}`}
          icon={<RobotOutlined />}
          color="#1677FF"
          subText="运行状态分布"
          onClick={() => navigate('/app/monitoring')}
          innerChart={
            <StatusDonut
              online={stats.online}
              offline={stats.offline}
              abnormal={stats.abnormal}
            />
          }
        />
      </Col>
      <Col {...statCardColProps}>
        <StatCard
          title="今日调用量"
          value={stats.todayCalls.toLocaleString()}
          suffix="次"
          icon={<LineChartOutlined />}
          color="#52C41A"
          trend={stats.todayCallsTrend}
          subText="较昨日"
          onClick={() => navigate('/app/monitoring')}
        />
      </Col>
      <Col {...statCardColProps}>
        <StatCard
          title="智能体总数"
          value={stats.total}
          suffix="个"
          icon={<RobotOutlined />}
          color="#1677FF"
          subText={`本月新增 ${stats.newThisMonth} 个`}
          onClick={() => navigate('/app/ledger')}
        />
      </Col>
      <Col {...statCardColProps}>
        <StatCard
          title="评测通过率（近 30 天）"
          value={stats.passRate}
          suffix="%"
          icon={<ExperimentOutlined />}
          color="#722ED1"
          trend={stats.passRateTrend}
          subText="较上月"
          onClick={() => navigate('/app/evaluation')}
        />
      </Col>
      <Col {...statCardColProps}>
        <StatCard
          title="本月成本"
          value={(stats.monthCost / 10000).toFixed(2)}
          suffix="万元"
          icon={<DollarOutlined />}
          color="#FA8C16"
          trend={stats.monthCostTrend}
          subText="较上月"
          onClick={() => navigate('/app/monitoring')}
        />
      </Col>
    </Row>
  );

  // ====================== 图表区 ======================
  const renderChartRow1 = () => (
    <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
      <Col xs={24} lg={12}>
        <ChartCard title="调用量趋势">
          <Line {...callVolumeConfig} />
        </ChartCard>
      </Col>
      <Col xs={24} lg={12}>
        <ChartCard
          title="科室使用排行 Top 10"
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined /> {dayjs().format('MM-DD HH:mm')}
            </Text>
          }
        >
          <Bar {...deptBarConfig} />
        </ChartCard>
      </Col>
    </Row>
  );

  const renderChartRow2 = () => (
    <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
      <Col xs={24} lg={8}>
        <ChartCard title="智能体类型分布">
          <Pie {...typePieConfig} />
        </ChartCard>
      </Col>
      <Col xs={24} lg={8}>
        <ChartCard
          title="安全风险概览"
          extra={<Text type="secondary" style={{ fontSize: 12 }}>六维指数</Text>}
        >
          <Radar {...radarConfig} />
        </ChartCard>
      </Col>
      <Col xs={24} lg={8}>
        <ChartCard
          title="响应时长分布"
          extra={<Text type="secondary" style={{ fontSize: 12 }}>今日</Text>}
        >
          <Column {...responseTimeConfig} />
        </ChartCard>
      </Col>
    </Row>
  );

  const renderChartRow3 = () => (
    <Row gutter={[12, 12]}>
      <Col span={24}>
        <ChartCard
          title="评测趋势（近 30 天）"
          extra={<Text type="secondary" style={{ fontSize: 12 }}>通过率</Text>}
        >
          <Line {...evalTrendConfig} />
        </ChartCard>
      </Col>
    </Row>
  );

  // ====================== 全屏 3 页轮播（每 10 秒切换） ======================
  const fullscreenPages: { key: string; title: string; render: () => React.ReactNode }[] = [
    {
      key: 'overview',
      title: '态势总览',
      render: () => (
        <>
          {renderStatCards()}
          {renderChartRow1()}
        </>
      ),
    },
    {
      key: 'analysis',
      title: '运营分析',
      render: () => (
        <>
          {renderStatCards()}
          {renderChartRow2()}
        </>
      ),
    },
    {
      key: 'eval',
      title: '安全与评测',
      render: () => (
        <>
          {renderStatCards()}
          {renderChartRow3()}
        </>
      ),
    },
  ];

  const renderCurrentPage = () => {
    if (!isFullscreen) {
      return (
        <>
          {renderStatCards()}
          {renderChartRow1()}
          {renderChartRow2()}
          {renderChartRow3()}
        </>
      );
    }
    return fullscreenPages[carouselIndex].render();
  };

  const bgColor = isFullscreen ? '#0a1628' : '#F5F5F5';

  return (
    <div
      style={{
        background: bgColor,
        padding: isFullscreen ? '16px 24px' : 16,
        transition: 'background 0.3s',
        // 全屏模式：用 fixed 覆盖整个视口，不隐藏 ProLayout 内部节点（避免 HMR / 嵌入资源跨域重连错误）
        ...(isFullscreen
          ? {
              position: 'fixed' as const,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              overflow: 'auto',
            }
          : { minHeight: 'auto' }),
      }}
    >
      {!isFullscreen && (
        <PageHeader title="数据大屏" subTitle="智能体运营数据可视化" />
      )}

      {/* ====================== 筛选栏（含唯一全屏按钮） ====================== */}
      <Card
        bordered={false}
        style={{
          marginBottom: 12,
          background: isFullscreen ? '#0f2245' : '#fff',
        }}
        styles={{ body: { padding: isFullscreen ? '10px 16px' : '12px 16px' } }}
      >
        <Space
          wrap
          size={[12, 8]}
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <Space wrap size={[12, 8]}>
            <Text strong style={{ color: isFullscreen ? '#fff' : undefined }}>
              筛选条件
            </Text>
            <Space size={4}>
              <Text
                type="secondary"
                style={{ color: isFullscreen ? 'rgba(255,255,255,0.65)' : undefined }}
              >
                时间范围：
              </Text>
              <Select
                value={timeRange}
                onChange={setTimeRange}
                options={timeRangeOptions}
                style={{ width: 110 }}
              />
            </Space>
            {timeRange === 'custom' && (
              <RangePicker
                value={customRange as any}
                onChange={(v) => setCustomRange(v as [Dayjs, Dayjs] | null)}
                style={{ width: 240 }}
              />
            )}
            <Space size={4}>
              <Text
                type="secondary"
                style={{ color: isFullscreen ? 'rgba(255,255,255,0.65)' : undefined }}
              >
                科室：
              </Text>
              <Select
                mode="multiple"
                placeholder="选择科室"
                value={selectedDepts}
                onChange={setSelectedDepts}
                options={departmentOptions}
                style={{ minWidth: 200 }}
                maxTagCount="responsive"
                allowClear
                showSearch
              />
            </Space>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={() => message.info('数据已刷新')}
            >
              刷新
            </Button>
            <Space size={4}>
              <Text
                style={{ fontSize: 12, color: isFullscreen ? 'rgba(255,255,255,0.85)' : undefined }}
              >
                自动刷新（5 分钟）
              </Text>
              <Switch
                checked={autoRefresh}
                onChange={setAutoRefresh}
                size="small"
                disabled={isFullscreen}
              />
            </Space>
          </Space>

          {/* ★ 全屏按钮（页面内唯一） */}
          <Button
            type="primary"
            ghost={!isFullscreen}
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? '退出全屏' : '全屏投屏'}
          </Button>
        </Space>
      </Card>

      {/* ====================== 全屏顶部信息条 ====================== */}
      {isFullscreen && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            padding: '8px 16px',
            background: '#0f2245',
            borderRadius: 6,
          }}
        >
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            <FundOutlined style={{ marginRight: 8 }} />
            医疗智能体管理平台 · {fullscreenPages[carouselIndex].title}
          </Title>
          <Space>
            <Text style={{ color: '#fff' }}>{dayjs().format('YYYY-MM-DD HH:mm:ss')}</Text>
            <Badge status="processing" text={<Text style={{ color: '#52C41A' }}>实时</Text>} />
            <Text style={{ color: 'rgba(255,255,255,0.65)' }}>10 秒后自动切换</Text>
          </Space>
        </div>
      )}

      {/* ====================== 主内容 ====================== */}
      {renderCurrentPage()}

      {/* ====================== 全屏分页指示器 ====================== */}
      {isFullscreen && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Space>
            {fullscreenPages.map((p, idx) => (
              <div
                key={p.key}
                onClick={() => setCarouselIndex(idx)}
                style={{
                  padding: '4px 16px',
                  borderRadius: 4,
                  background: carouselIndex === idx ? '#1677FF' : 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  userSelect: 'none',
                }}
              >
                {p.title}
              </div>
            ))}
          </Space>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
