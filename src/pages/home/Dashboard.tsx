import { useMemo, useState } from "react";
import { Line, Pie } from "@ant-design/charts";
import {
  Button,
  Card,
  Col,
  Flex,
  Row,
  Segmented,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ApartmentOutlined,
  ApiOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CloudServerOutlined,
  ExclamationCircleFilled,
  FullscreenExitOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  EnvironmentFilled,
  RiseOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useDemoSettings } from "../../hooks/useDemoSettings";
import "./Dashboard.css";

const { Text, Title } = Typography;
const panelStyle = {
  border: "1px solid #dce8f7",
  boxShadow: "0 5px 18px rgba(22,119,255,.055)",
};
const colors = ["#1677ff", "#13c2c2", "#722ed1", "#fa8c16", "#eb2f96"];

const month = ["02月", "03月", "04月", "05月", "06月", "07月"];
const spark = (values: number[]) =>
  month.map((label, index) => ({ label, value: values[index] }));
const adminMetrics = [
  [
    "智能体数量",
    "128",
    "个",
    "较昨日 +3",
    [88, 96, 104, 110, 119, 128],
    "/app/ledger/list",
    "#1677ff",
  ],
  [
    "异常智能体数量",
    "6",
    "个",
    "较昨日 -2",
    [9, 7, 8, 11, 8, 6],
    "/app/ledger/list?status=abnormal",
    "#fa541c",
  ],
  [
    "智能体总调用量",
    "286.4万",
    "次",
    "较昨日 +12.6%",
    [152, 177, 196, 228, 252, 286],
    "/app/monitoring/business",
    "#13c2c2",
  ],
  [
    "智能体成功调用率",
    "98.72",
    "%",
    "本月提升 0.31%",
    [97.8, 98.1, 98.2, 98.3, 98.4, 98.72],
    "/app/monitoring/business",
    "#52c41a",
  ],
  [
    "智能体告警次数",
    "37",
    "次",
    "较昨日 -5",
    [52, 45, 61, 48, 42, 37],
    "/app/monitoring/alert-events",
    "#722ed1",
  ],
  [
    "Token累计使用成本",
    "¥46.8万",
    "",
    "较昨日 +¥1.2万",
    [22, 27, 32, 36, 41, 46.8],
    "/app/monitoring/cost",
    "#fa8c16",
  ],
] as const;
const deptMetrics = [
  [
    "智能体总调用量",
    "32.6万",
    "次",
    "较昨日 +8.2%",
    [18, 21, 23, 26, 29, 32.6],
    "/app/monitoring/business",
    "#1677ff",
  ],
  [
    "智能体成功调用率",
    "99.12",
    "%",
    "本月提升 0.24%",
    [98.2, 98.5, 98.6, 98.8, 98.9, 99.12],
    "/app/monitoring/business",
    "#52c41a",
  ],
  [
    "响应时间 P95",
    "1.28",
    "s",
    "较上月 -0.16s",
    [1.72, 1.61, 1.55, 1.48, 1.44, 1.28],
    "/app/monitoring/business",
    "#13c2c2",
  ],
  [
    "智能体告警次数",
    "8",
    "次",
    "较昨日 -2",
    [16, 13, 11, 14, 10, 8],
    "/app/monitoring/alert-events",
    "#722ed1",
  ],
  [
    "Token累计使用成本",
    "¥5.82万",
    "",
    "较昨日 +¥0.18万",
    [2.6, 3.2, 3.8, 4.5, 5.1, 5.82],
    "/app/monitoring/cost",
    "#fa8c16",
  ],
] as const;

const departments = [
  { name: "影像科", value: 24 },
  { name: "心内科", value: 21 },
  { name: "检验科", value: 18 },
  { name: "急诊科", value: 16 },
  { name: "超声科", value: 14 },
  { name: "药学部", value: 11 },
];
const topAgents = [
  { name: "影像报告助手", value: 46820 },
  { name: "病历质控助手", value: 41650 },
  { name: "检验解读助手", value: 35860 },
  { name: "急诊分诊助手", value: 28310 },
  { name: "用药审核助手", value: 24680 },
];
const stages = [
  { name: "诊断", value: 42 },
  { name: "治疗", value: 31 },
  { name: "检查", value: 24 },
  { name: "随访", value: 18 },
  { name: "预防", value: 13 },
];
const risks = [
  { name: "高风险", value: 12 },
  { name: "中风险", value: 35 },
  { name: "低风险", value: 81 },
];
const alertTypes = [
  { name: "业务监控", value: 14 },
  { name: "状态监控", value: 10 },
  { name: "成本监控", value: 7 },
  { name: "安全监控", value: 6 },
];
const alertLevels = [
  { name: "高级", value: 5 },
  { name: "中级", value: 12 },
  { name: "低级", value: 20 },
];
const alertRank = [
  { name: "影像报告助手", value: 9 },
  { name: "病历质控助手", value: 7 },
  { name: "急诊分诊助手", value: 6 },
  { name: "检验解读助手", value: 4 },
  { name: "随访助手", value: 3 },
];
const alerts = [
  ["影像报告助手响应超时", "P95 > 2s", "高级"],
  ["病历质控助手成功率下降", "< 97%", "中级"],
  ["急诊分诊助手实例离线", "离线 > 3min", "高级"],
  ["检验解读助手成本超限", "> ¥800/日", "中级"],
  ["随访助手调用量突增", "环比 > 80%", "低级"],
];
const resources = [
  ["HIS", "医院信息系统", 38, true],
  ["EMR", "电子病历系统", 31, true],
  ["LIS", "实验室信息系统", 16, true],
  ["PACS", "医学影像系统", 22, true],
  ["RIS", "放射信息系统", 12, true],
  ["UIS", "超声信息系统", 9, true],
  ["EIS", "内镜信息系统", 6, false],
  ["PIS", "病理信息系统", 8, true],
] as const;

const deploymentPoints = [
  {
    id: "AGT-2025-002",
    name: "智能导诊助手",
    version: "v2.1.3",
    department: "导诊台",
    status: "运行中",
    x: 16,
    y: 57,
    tone: "#31a8ff",
  },
  {
    id: "AGT-2025-005",
    name: "预问诊智能体",
    version: "v3.2.0",
    department: "耳鼻喉科",
    status: "运行中",
    x: 34,
    y: 20,
    tone: "#9a61ff",
  },
  {
    id: "AGT-2025-006",
    name: "病历生成智能体",
    version: "v1.8.5",
    department: "心血管内科",
    status: "运行中",
    x: 70,
    y: 18,
    tone: "#4bdc78",
  },
  {
    id: "AGT-2025-008",
    name: "分诊智能体",
    version: "v2.4.1",
    department: "急诊科",
    status: "降级",
    x: 47,
    y: 55,
    tone: "#ffb01f",
  },
  {
    id: "AGT-2025-012",
    name: "随访智能体",
    version: "v1.6.2",
    department: "普外科",
    status: "运行中",
    x: 72,
    y: 67,
    tone: "#43dc79",
  },
  {
    id: "AGT-2025-014",
    name: "肺功能智能体",
    version: "v2.0.4",
    department: "呼吸内科",
    status: "运行中",
    x: 85,
    y: 39,
    tone: "#9a61ff",
  },
  {
    id: "AGT-2025-015",
    name: "影像解读智能体",
    version: "v4.1.0",
    department: "医学影像科",
    status: "故障",
    x: 27,
    y: 78,
    tone: "#ff513e",
  },
] as const;

function KpiCard({
  metric,
}: {
  metric: (typeof adminMetrics)[number] | (typeof deptMetrics)[number];
}) {
  const navigate = useNavigate();
  const [title, value, suffix, compare, values, path, color] = metric;
  return (
    <Card
      hoverable
      onClick={() => navigate(path)}
      style={{
        ...panelStyle,
        height: 128,
        cursor: "pointer",
        overflow: "hidden",
        position: "relative",
      }}
      styles={{
        body: {
          padding: "15px 16px 10px",
          position: "relative",
          height: "100%",
        },
      }}
    >
      <div style={{ position: "relative", zIndex: 2, maxWidth: "68%" }}>
        <Text
          type="secondary"
          ellipsis
          style={{ display: "block", fontSize: 13, whiteSpace: "nowrap" }}
        >
          {title}
        </Text>
        <div style={{ marginTop: 4, whiteSpace: "nowrap" }}>
          <Text strong style={{ color, fontSize: 25, lineHeight: 1.25 }}>
            {value}
          </Text>
          <Text style={{ color, marginLeft: 3 }}>{suffix}</Text>
        </div>
        <Text
          style={{
            display: "block",
            marginTop: 7,
            color: compare.includes("-") ? "#52c41a" : "#8c8c8c",
            fontSize: 11,
            whiteSpace: "nowrap",
          }}
        >
          <RiseOutlined /> {compare}
        </Text>
      </div>
      <div
        style={{
          position: "absolute",
          width: "39%",
          right: 10,
          bottom: 15,
          opacity: 0.9,
        }}
      >
        <Line
          data={spark([...values])}
          xField="label"
          yField="value"
          height={52}
          axis={false}
          tooltip={false}
          color={color}
          padding={0}
          point={false}
        />
      </div>
    </Card>
  );
}

function ChartCard({
  title,
  children,
  extra,
  className,
}: {
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      size="small"
      title={<Text strong>{title}</Text>}
      extra={extra}
      className={`dashboard-chart-card ${className || ""}`}
      style={panelStyle}
      styles={{ header: { minHeight: 38 }, body: { padding: "8px 12px" } }}
    >
      {children}
    </Card>
  );
}

function SimpleBars({
  data,
  color = "#1677ff",
  onClick,
}: {
  data: { name: string; value: number }[];
  color?: string;
  onClick?: (name: string) => void;
}) {
  const max = Math.max(...data.map((item) => item.value));
  return (
    <Space
      direction="vertical"
      size={5}
      style={{ width: "100%", padding: "2px" }}
    >
      {data.map((item) => (
        <div
          key={item.name}
          onClick={() => onClick?.(item.name)}
          style={{ cursor: onClick ? "pointer" : "default" }}
        >
          <Flex justify="space-between" style={{ marginBottom: 2 }}>
            <Text style={{ fontSize: 12 }}>{item.name}</Text>
            <Text strong style={{ fontSize: 12 }}>
              {item.value.toLocaleString()}
            </Text>
          </Flex>
          <div
            style={{
              height: 7,
              overflow: "hidden",
              borderRadius: 6,
              background: "#edf2f8",
            }}
          >
            <div
              style={{
                width: `${Math.max(8, (item.value / max) * 100)}%`,
                height: "100%",
                borderRadius: 6,
                background: `linear-gradient(90deg,${color},${color}aa)`,
              }}
            />
          </div>
        </div>
      ))}
    </Space>
  );
}

function ResourceTopology({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  const shown = isAdmin
    ? resources
    : resources.map(
        (r) =>
          [r[0], r[1], Math.max(2, Math.round(r[2] * 0.22)), r[3]] as const,
      );
  return (
    <div
      className="dashboard-topology"
      style={{
        position: "relative",
        height: "100%",
        minHeight: 0,
        padding: "18px 10px",
        borderRadius: 12,
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 49%,#dceeff 0,#f7fbff 35%,#fff 68%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "49%",
          transform: "translate(-50%,-50%)",
          textAlign: "center",
          width: 168,
          padding: "25px 8px",
          color: "#fff",
          borderRadius: 18,
          background: "linear-gradient(135deg,#1677ff,#13c2c2)",
          boxShadow: "0 10px 28px #1677ff55",
        }}
      >
        <CloudServerOutlined style={{ fontSize: 30 }} />
        <div style={{ fontWeight: 700, marginTop: 6 }}>
          {isAdmin ? "全院智能体中心" : "影像科智能体中心"}
        </div>
        <small>{isAdmin ? "128 个智能体" : "18 个智能体"}</small>
      </div>
      {shown.map(([code, name, count, online], i) => {
        const angle = (Math.PI * 2 * i) / shown.length - Math.PI / 2;
        const x = 50 + Math.cos(angle) * 38;
        const y = 49 + Math.sin(angle) * 39;
        return (
          <Tooltip
            key={code}
            title={`${name} · ${count} 个智能体 · ${online ? "连接正常" : "连接异常"}`}
          >
            <button
              onClick={() =>
                navigate(`/app/resource-center/resources?keyword=${code}`)
              }
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%,-50%)",
                width: 120,
                padding: "10px 5px",
                borderRadius: 10,
                cursor: "pointer",
                border: `1px solid ${online ? "#91caff" : "#ffbb96"}`,
                color: "#1f2d3d",
                background: "#fff",
                boxShadow: "0 4px 12px #94a9c733",
              }}
            >
              <ApiOutlined style={{ color: online ? "#1677ff" : "#fa541c" }} />{" "}
              <b>{code}</b>
              <div
                style={{
                  fontSize: 10,
                  color: "#8c8c8c",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {count} 个智能体 · {online ? "正常" : "异常"}
              </div>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

function AgentDistributionMap() {
  const navigate = useNavigate();
  return (
    <div className="hospital-agent-map" aria-label="医院智能体分布地图">
      <div className="hospital-campus" aria-hidden="true">
        <i className="campus-building campus-building--a" />
        <i className="campus-building campus-building--b" />
        <i className="campus-building campus-building--c" />
        <i className="campus-building campus-building--d" />
        <i className="campus-building campus-building--e" />
        <i className="campus-building campus-building--f" />
        <i className="campus-road campus-road--a" />
        <i className="campus-road campus-road--b" />
      </div>
      <div className="hospital-map-caption">
        <EnvironmentFilled /> 院区数字孪生地图 <span>· 7 个部署点位</span>
      </div>
      {deploymentPoints.map((point) => (
        <button
          key={point.id}
          type="button"
          className="agent-map-point"
          style={
            {
              left: `${point.x}%`,
              top: `${point.y}%`,
              "--point-color": point.tone,
            } as React.CSSProperties
          }
          onClick={() => navigate(`/app/ledger/detail/${point.id}`)}
          aria-label={`查看${point.name}360画像`}
        >
          <span className="agent-map-pin">
            <RobotOutlined />
          </span>
          <span className="agent-map-pulse" />
          <span className="agent-map-popover">
            <b>
              {point.name}
              <em>{point.version}</em>
            </b>
            <span>科室：{point.department}</span>
            <span>
              状态：
              <i />
              {point.status}
            </span>
            <small>点击查看 360 画像</small>
          </span>
        </button>
      ))}
      <div className="hospital-map-legend">
        <span>
          <i style={{ background: "#43dc79" }} />
          运行中
        </span>
        <span>
          <i style={{ background: "#ffb01f" }} />
          降级
        </span>
        <span>
          <i style={{ background: "#ff513e" }} />
          故障
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { demoRole } = useDemoSettings();
  const isAdmin = demoRole === "信息科管理员";
  const metrics = isAdmin ? adminMetrics : deptMetrics;
  const [range, setRange] = useState("30d");
  const [sortAsc, setSortAsc] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [centerView, setCenterView] = useState<"map" | "resources">("map");
  const navigate = useNavigate();
  const sortedDepartments = useMemo(
    () =>
      [...departments].sort((a, b) =>
        sortAsc ? a.value - b.value : b.value - a.value,
      ),
    [sortAsc],
  );
  const pieBase = {
    angleField: "value",
    colorField: "name",
    innerRadius: 0.58,
    height: 130,
    theme: "classicDark",
    legend: { position: "bottom" },
    label: { text: "value", position: "outside" },
  } as any;
  return (
    <div
      className={`dashboard-screen${fullscreen ? " dashboard-screen--fullscreen" : ""}`}
    >
      <Card
        className="dashboard-header"
        style={{
          ...panelStyle,
          background: "linear-gradient(110deg,#edf6ff,#fff 55%,#eafafa)",
        }}
        styles={{ body: { padding: "10px 16px" } }}
      >
        <Flex justify="space-between" align="center" wrap gap={8}>
          <Space size={11}>
            <Flex
              align="center"
              justify="center"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                color: "#fff",
                fontSize: 21,
                background: "linear-gradient(135deg,#1677ff,#13c2c2)",
              }}
            >
              <RobotOutlined />
            </Flex>
            <div>
              <Title level={3} style={{ margin: 0, fontSize: 24 }}>
                {isAdmin
                  ? "全院智能体运行态势大屏"
                  : "影像科智能体运行态势大屏"}
              </Title>
              <Text type="secondary">
                {isAdmin
                  ? "全院纳管智能体运行、资源连接与告警态势总览"
                  : "本科室智能体运行、资源连接与待处理告警总览"}
              </Text>
            </div>
          </Space>
          <Space wrap size={8}>
            <Select
              value={range}
              onChange={setRange}
              style={{ width: 100 }}
              options={[
                { value: "today", label: "今日" },
                { value: "7d", label: "近7天" },
                { value: "30d", label: "近30天" },
              ]}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => message.success("大屏数据已刷新")}
            >
              刷新
            </Button>
            <Button
              icon={
                fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />
              }
              onClick={() => setFullscreen(!fullscreen)}
            >
              {fullscreen ? "退出全屏" : "全屏投屏"}
            </Button>
          </Space>
        </Flex>
      </Card>

      <Row gutter={[10, 10]} className="dashboard-kpis">
        {metrics.map((m) => (
          <Col
            key={m[0]}
            xs={24}
            sm={12}
            lg={isAdmin ? 8 : undefined}
            xl={isAdmin ? 4 : undefined}
            flex={isAdmin ? undefined : "1 1 200px"}
          >
            <KpiCard metric={m} />
          </Col>
        ))}
      </Row>

      <Row gutter={[10, 10]} align="stretch" className="dashboard-main">
        <Col
          xs={24}
          xl={6}
          className={`dashboard-side dashboard-side--left${isAdmin ? "" : " dashboard-side--left-dept"}`}
        >
          {isAdmin ? (
            <>
              <ChartCard
                title="智能体科室分布"
                extra={
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setSortAsc(!sortAsc)}
                  >
                    {sortAsc ? "从少到多" : "从多到少"}
                  </Button>
                }
              >
                <SimpleBars
                  data={sortedDepartments}
                  onClick={(name) =>
                    navigate(`/app/ledger/list?department=${name}`)
                  }
                />
              </ChartCard>
              <ChartCard title="高频调用智能体 TOP5">
                <SimpleBars data={topAgents} color="#13c2c2" />
              </ChartCard>
              <ChartCard title="智能体诊疗环节分布">
                <Pie
                  {...pieBase}
                  data={stages}
                  onReady={(p: any) =>
                    p.on("element:click", (e: any) =>
                      navigate(`/app/ledger/list?stage=${e.data.data.name}`),
                    )
                  }
                />
              </ChartCard>
              <ChartCard title="智能体风险分级">
                <Pie
                  {...pieBase}
                  data={risks}
                  color={["#ff4d4f", "#faad14", "#52c41a"]}
                  onReady={(p: any) =>
                    p.on("element:click", (e: any) =>
                      navigate(`/app/ledger/list?risk=${e.data.data.name}`),
                    )
                  }
                />
              </ChartCard>
            </>
          ) : (
            <>
              <ChartCard
                className="dashboard-dept-status"
                title="智能体实时状态"
              >
                <Row gutter={[10, 10]}>
                  {[
                    ["实时在线", 16, "#52c41a", <CheckCircleFilled />],
                    ["实时离线", 2, "#ff4d4f", <ExclamationCircleFilled />],
                    [
                      "平均异常持续时长",
                      "18m",
                      "#fa8c16",
                      <ClockCircleOutlined />,
                    ],
                    ["累计禁用", 3, "#8c8c8c", <SafetyCertificateOutlined />],
                  ].map(([label, value, color, icon]) => (
                    <Col span={12} key={String(label)}>
                      <Card
                        hoverable
                        onClick={() => navigate("/app/ledger/list")}
                        styles={{ body: { padding: 14 } }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {label}
                        </Text>
                        <div
                          style={{
                            color: String(color),
                            fontSize: 25,
                            fontWeight: 700,
                          }}
                        >
                          {icon} {value}
                        </div>
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          {label === "累计禁用"
                            ? "较昨日 +1 · 月趋势平稳"
                            : "点击查看明细"}
                        </Text>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </ChartCard>
              <ChartCard title="禁用智能体月趋势">
                <Line
                  data={spark([1, 1, 2, 2, 2, 3])}
                  xField="label"
                  yField="value"
                  height={260}
                  theme="classicDark"
                  smooth
                  color="#27d9ff"
                  point={{ size: 4 }}
                />
              </ChartCard>
            </>
          )}
        </Col>
        <Col xs={24} xl={12} className="dashboard-center">
          <ChartCard
            className="dashboard-resource-card"
            title={
              isAdmin && centerView === "map"
                ? "医院智能体分布地图"
                : "医院科室已关联资源情况"
            }
            extra={
              isAdmin ? (
                <Segmented
                  size="small"
                  value={centerView}
                  onChange={(value) =>
                    setCenterView(value as "map" | "resources")
                  }
                  options={[
                    {
                      label: "智能体分布",
                      value: "map",
                      icon: <EnvironmentFilled />,
                    },
                    {
                      label: "关联资源",
                      value: "resources",
                      icon: <ApartmentOutlined />,
                    },
                  ]}
                />
              ) : (
                <Text type="secondary">
                  <ApartmentOutlined /> 点击资源查看详情
                </Text>
              )
            }
          >
            {isAdmin && centerView === "map" ? (
              <AgentDistributionMap />
            ) : (
              <ResourceTopology isAdmin={isAdmin} />
            )}
          </ChartCard>
        </Col>
        <Col xs={24} xl={6} className="dashboard-side dashboard-side--right">
          <ChartCard
            title={isAdmin ? "实时告警情况" : "待处理告警"}
            extra={
              <Button
                type="link"
                size="small"
                onClick={() => navigate("/app/monitoring/alert-events")}
              >
                全部告警
              </Button>
            }
          >
            <div style={{ maxHeight: 225, overflowY: "auto" }}>
              {alerts.map(([name, threshold, level], i) => (
                <div
                  key={name}
                  onClick={() => navigate("/app/monitoring/alert-events")}
                  style={{
                    padding: "9px 3px",
                    borderBottom: "1px solid #f0f0f0",
                    cursor: "pointer",
                  }}
                >
                  <Flex justify="space-between">
                    <Text ellipsis style={{ maxWidth: "72%" }}>
                      <ThunderboltOutlined
                        style={{ color: i < 3 ? "#fa541c" : "#faad14" }}
                      />{" "}
                      {name}
                    </Text>
                    <Tag
                      color={
                        level === "高级"
                          ? "red"
                          : level === "中级"
                            ? "orange"
                            : "blue"
                      }
                    >
                      {level}
                    </Tag>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    触发阈值：{threshold}
                  </Text>
                </div>
              ))}
            </div>
          </ChartCard>
          <ChartCard title="告警类型分布">
            <Pie {...pieBase} data={alertTypes} />
          </ChartCard>
          <ChartCard title="告警级别分布">
            <Pie
              {...pieBase}
              data={alertLevels}
              color={["#ff4d4f", "#faad14", "#69b1ff"]}
            />
          </ChartCard>
          <ChartCard title="智能体告警次数排行">
            <SimpleBars data={alertRank} color="#722ed1" />
          </ChartCard>
        </Col>
      </Row>
    </div>
  );
}
