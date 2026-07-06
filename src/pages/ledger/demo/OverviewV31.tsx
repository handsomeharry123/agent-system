/**
 * 统一台账中心 - 智能化升级 Demo
 * §3.1 全院台账态势概览与分流 Demo 页(信息科管理员/科室用户两视角)
 *
 * 依据《台账中心智能化升级-需求说明V1》§3.1：
 *   - §3.1.1 台账总览首页:Agent 非打断气泡主动汇报态势 + 点击指标名称分流
 *   - §3.1.2 Agent 对话入口:自然语言问答 + 推荐问句 + 跨中心聚合作答
 *
 * 设计：
 *   - 顶部：PageHeader + 视角切换(管理员/科室用户)
 *   - 中部：完整保留现有台账总览(V1.5)做底,加 ① 右上角浮动机器人 icon ② 启动后非打断态势汇报气泡 ③ 点击 icon 唤起对话浮层
 *   - 底部：信息科管理员视角 KPI + 趋势图(简化版,演示用)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Radio,
  Space,
  Segmented,
  Tag,
  Empty,
  Alert,
  Tooltip,
  Statistic,
  Button,
} from 'antd';
import {
  RobotOutlined,
  MessageOutlined,
  EyeOutlined,
  RightOutlined,
  ThunderboltFilled,
  FireFilled,
  CheckCircleFilled,
  BarChartOutlined,
} from '@ant-design/icons';
import PageHeader from '../../../components/PageHeader';
import { useDemoSettings } from '../../../hooks/useDemoSettings';
import StatusBubbleV31, {
  buildPlatformAdminMetrics,
  buildDeptAdminMetrics,
} from './StatusBubbleV31';
import ChatPanelV31 from './ChatPanelV31';

const { Text } = Typography;

// ============ 简化的 KPI 卡片(仅用于演示) ============
interface KpiCardProps {
  label: string;
  value: number | string;
  unit?: string;
  color: string;
  icon: React.ReactNode;
  hint?: string;
  onClick?: () => void;
}
const KpiCard: React.FC<KpiCardProps> = ({ label, value, unit, color, icon, hint, onClick }) => (
  <Card
    hoverable={!!onClick}
    bordered={false}
    onClick={onClick}
    style={{ height: 110, cursor: onClick ? 'pointer' : 'default', border: '1px solid #F0F0F0' }}
    bodyStyle={{ padding: '12px 16px' }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Space size={6} align="center">
        <Text type="secondary" style={{ fontSize: 13 }}>
          {label}
        </Text>
        {hint && (
          <Tooltip title={hint}>
            <EyeOutlined style={{ fontSize: 11, color: '#BFBFBF' }} />
          </Tooltip>
        )}
      </Space>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: `${color}15`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
        }}
      >
        {icon}
      </div>
    </div>
    <div style={{ marginTop: 8, fontSize: 26, fontWeight: 600, color, lineHeight: 1.1 }}>
      {value}
      {unit && <span style={{ fontSize: 14, marginLeft: 4, color: '#8C8C8C' }}>{unit}</span>}
    </div>
  </Card>
);

// ============ 简化趋势图(SVG) ============
const TrendLine: React.FC<{
  data: Array<{ x: string; y: number }>;
  color: string;
  title: string;
}> = ({ data, color, title }) => {
  const W = 800;
  const H = 220;
  const pad = { top: 30, right: 20, bottom: 32, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const maxV = Math.max(...data.map((d) => d.y), 1);
  const stepX = innerW / (data.length - 1);
  const points = data.map((d, i) => {
    const x = pad.left + i * stepX;
    const y = pad.top + innerH - (d.y / maxV) * innerH;
    // 注意:d.x 是分类轴标签(如 "1月"),不能与数值 x 冲突;
    //   这里把标签/数据值单独存,避免 spread 把 string 覆盖到数字 x
    return { x, y, label: d.x, value: d.y };
  });
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${pad.top + innerH} L ${points[0].x} ${pad.top + innerH} Z`;

  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {/* 网格 */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const y = pad.top + innerH * (1 - p);
          return (
            <g key={p}>
              <line x1={pad.left} y1={y} x2={pad.left + innerW} y2={y} stroke="#F0F0F0" />
              <text x={pad.left - 4} y={y + 3} fontSize={10} fill="#8C8C8C" textAnchor="end">
                {Math.round(maxV * p)}
              </text>
            </g>
          );
        })}
        {/* 面积 + 折线 */}
        <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
        {/* 节点 */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke={color} strokeWidth={2} />
            <text
              x={p.x}
              y={p.y - 8}
              fontSize={10}
              fill="#262626"
              textAnchor="middle"
            >
              {p.value}
            </text>
            <text
              x={p.x}
              y={H - pad.bottom + 16}
              fontSize={10}
              fill="#8C8C8C"
              textAnchor="middle"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ============ 主体 ============
type Scope = 'platform_admin' | 'dept_admin';

const OverviewV31: React.FC = () => {
  const navigate = useNavigate();
  const { demoRole } = useDemoSettings();
  // 与全局角色联动：信息科管理员 → platform_admin / 科室管理员 → dept_admin
  //   - 仍允许用户手动 Segmented 切换（局部覆盖）
  const [scope, setScope] = useState<Scope>(
    demoRole === '信息科管理员' ? 'platform_admin' : 'dept_admin',
  );
  const robotRef = useRef<HTMLDivElement>(null);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  // 切换角色时,自动重启气泡演示 + 同步 scope
  //   - 监听 demoRole(全局角色变化) → 重置 scope 到对应口径
  //   - 同时监听 scope(Segmented 切换) → 同步重启气泡
  useEffect(() => {
    setBubbleOpen(true);
    setChatOpen(false);
  }, [scope]);
  const prevRoleRef = useRef(demoRole);
  useEffect(() => {
    if (prevRoleRef.current !== demoRole) {
      prevRoleRef.current = demoRole;
      setScope(demoRole === '信息科管理员' ? 'platform_admin' : 'dept_admin');
    }
  }, [demoRole]);

  const metrics = useMemo(
    () => (scope === 'platform_admin' ? buildPlatformAdminMetrics() : buildDeptAdminMetrics()),
    [scope],
  );

  // 6 月新增数据(管理员视角更全)
  const trendData = useMemo(() => {
    if (scope === 'platform_admin') {
      return [
        { x: '1月', y: 4 },
        { x: '2月', y: 3 },
        { x: '3月', y: 5 },
        { x: '4月', y: 4 },
        { x: '5月', y: 6 },
        { x: '6月', y: 6 },
      ];
    }
    return [
      { x: '1月', y: 0 },
      { x: '2月', y: 1 },
      { x: '3月', y: 1 },
      { x: '4月', y: 0 },
      { x: '5月', y: 1 },
      { x: '6月', y: 1 },
    ];
  }, [scope]);

  return (
    <div
      style={{
        padding: 16,
        background: '#F5F5F5',
        minHeight: 'calc(100vh - 64px)',
        position: 'relative',
      }}
    >
      <PageHeader
        title="台账总览(智能化升级 Demo · §3.1)"
        subTitle="PRD §3.1 · 态势汇报气泡 · Agent 对话浮层 · 自然语言问答"
        extra={
          <Space size={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              视角切换:
            </Text>
            <Segmented
              value={scope}
              onChange={(v) => setScope(v as Scope)}
              options={[
                { label: '信息科管理员', value: 'platform_admin' },
                { label: '科室用户', value: 'dept_admin' },
              ]}
            />
          </Space>
        }
      />

      {/* 演示提示 */}
      <Alert
        type="info"
        showIcon
        style={{ marginTop: 12, marginBottom: 12 }}
        message={
          <span>
            💡 本页为 PRD §3.1 功能 Demo —
            <strong>①</strong> 进入页面时,右下角浮动机器人旁会弹出非打断态势汇报气泡(可关闭);
            <strong>②</strong> 点击右下角机器人可唤起 Agent 对话浮层,顶部同步态势 + 推荐问句 + 自然语言问答;
            <strong>③</strong> 切换上方"视角"可在管理员(全院) / 科室用户(本科室)两种数据权限间对比。
          </span>
        }
      />

      {/* ===== Demo 现状态看板 ===== */}
      <Row gutter={[12, 12]} style={{ marginTop: 4 }}>
        <Col xs={24} sm={12} md={6}>
          <KpiCard
            label={scope === 'platform_admin' ? '全院智能体' : '本科室智能体'}
            value={metrics.totalAgents}
            unit="个"
            color="#1677FF"
            icon={<BarChartOutlined />}
            hint="已审核通过并纳管的智能体总数"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KpiCard
            label="本月新增"
            value={metrics.monthNew}
            unit="个"
            color="#13C2C2"
            icon={<ThunderboltFilled />}
            hint="近 30 天新纳入台账的智能体数量"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KpiCard
            label="待评测 + 评测中"
            value={metrics.pendingEval + metrics.evaluating}
            unit="个"
            color="#FA8C16"
            icon={<RightOutlined />}
            hint="未完成准入评测的智能体合计数"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <KpiCard
            label="今日告警 / 故障"
            value={`${metrics.alarmCount} / ${metrics.faultCount}`}
            unit="次"
            color="#FF4D4F"
            icon={<FireFilled />}
            hint="监控中心当前未关闭的告警与故障合计"
          />
        </Col>
      </Row>

      {/* 趋势图(简化) */}
      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col span={24}>
          <Card
            bordered={false}
            style={{ border: '1px solid #F0F0F0' }}
            bodyStyle={{ padding: 8 }}
            title={
              <Space>
                <span style={{ fontSize: 14, fontWeight: 600 }}>每月新增纳管智能体数量</span>
                <Tooltip title="本页 Demo 用纯 SVG 简化展示;线上版使用 G2Plot 折线图(G2 v5),支持周/月/季度切换与下钻。">
                  <EyeOutlined style={{ fontSize: 12, color: '#BFBFBF' }} />
                </Tooltip>
              </Space>
            }
          >
            <TrendLine
              title=""
              data={trendData}
              color={scope === 'platform_admin' ? '#1677FF' : '#13C2C2'}
            />
          </Card>
        </Col>
      </Row>

      {/* 关键指标恢复情况 */}
      <Row gutter={[12, 12]} style={{ marginTop: 12, marginBottom: 80 }}>
        <Col span={24}>
          <Card
            bordered={false}
            style={{ border: '1px solid #F0F0F0' }}
            bodyStyle={{ padding: 16 }}
            title={<span style={{ fontSize: 14, fontWeight: 600 }}>运行风险态势(今日)</span>}
          >
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title={
                    <Space size={4}>
                      <FireFilled style={{ color: '#FF4D4F' }} />
                      <span>告警</span>
                    </Space>
                  }
                  value={metrics.alarmCount}
                  suffix="次"
                  valueStyle={{ color: '#FF4D4F', fontSize: 22 }}
                />
                <div style={{ fontSize: 11, color: '#8C8C8C', marginTop: 2 }}>
                  建议优先处理其中 P0 告警 {Math.ceil(metrics.alarmCount / 3)} 条
                </div>
              </Col>
              <Col span={6}>
                <Statistic
                  title={
                    <Space size={4}>
                      <FireFilled style={{ color: '#FF4D4F' }} />
                      <span>故障</span>
                    </Space>
                  }
                  value={metrics.faultCount}
                  suffix="次"
                  valueStyle={{ color: '#FF4D4F', fontSize: 22 }}
                />
                <div style={{ fontSize: 11, color: '#8C8C8C', marginTop: 2 }}>
                  中断类 · 已影响 2 个科室业务
                </div>
              </Col>
              <Col span={6}>
                <Statistic
                  title={
                    <Space size={4}>
                      <CheckCircleFilled style={{ color: '#52C41A' }} />
                      <span>已恢复</span>
                    </Space>
                  }
                  value={metrics.recoveredCount}
                  suffix="次"
                  valueStyle={{ color: '#52C41A', fontSize: 22 }}
                />
                <div style={{ fontSize: 11, color: '#8C8C8C', marginTop: 2 }}>
                  近 24 小时平均恢复时长 38 分钟
                </div>
              </Col>
              <Col span={6}>
                <Statistic
                  title={
                    <Space size={4}>
                      <CheckCircleFilled style={{ color: '#52C41A' }} />
                      <span>正常运行率</span>
                    </Space>
                  }
                  value={98.6}
                  precision={1}
                  suffix="%"
                  valueStyle={{ color: '#52C41A', fontSize: 22 }}
                />
                <div style={{ fontSize: 11, color: '#8C8C8C', marginTop: 2 }}>
                  高于全院均值 97.4%
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* ===== 右下角浮动机器人(对应 PRD §3.1.1:气泡关联机器人) ===== */}
      <div
        ref={robotRef}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1677FF 0%, #4096FF 100%)',
          boxShadow: '0 8px 24px rgba(22,119,255,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 28,
          cursor: 'pointer',
          zIndex: 1050,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onClick={() => {
          setBubbleOpen(false);
          setChatOpen(true);
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
          (e.currentTarget as HTMLElement).style.boxShadow =
            '0 12px 32px rgba(22,119,255,0.45)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLElement).style.boxShadow =
            '0 8px 24px rgba(22,119,255,0.35)';
        }}
        title="点击唤起医小管对话窗口"
      >
        <RobotOutlined />
        {/* 未读红点(模拟告警/故障数) */}
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            background: '#FF4D4F',
            color: '#fff',
            fontSize: 11,
            lineHeight: '18px',
            textAlign: 'center',
            padding: '0 5px',
            border: '2px solid #fff',
          }}
        >
          {metrics.alarmCount + metrics.faultCount}
        </div>
      </div>

      {/* ===== 非打断态势汇报气泡(§3.1.1) ===== */}
      {bubbleOpen && !chatOpen && (
        <StatusBubbleV31
          metrics={metrics}
          anchorRef={robotRef}
          onClose={() => setBubbleOpen(false)}
          variant="robot"
          onGenerateReport={() => navigate('/app/ledger-demo/report')}
          onSubscribeBriefing={() => navigate('/app/ledger-demo/report?openSubscribe=1')}
          onOpenChat={() => {
            setBubbleOpen(false);
            setChatOpen(true);
          }}
        />
      )}

      {/* ===== Agent 对话浮层(§3.1.2) ===== */}
      {chatOpen && <ChatPanelV31 scope={scope} onClose={() => setChatOpen(false)} />}

      {/* 重置气泡按钮(当气泡被关闭后,提供再次唤起) */}
      {!bubbleOpen && !chatOpen && (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<MessageOutlined />}
          style={{
            position: 'fixed',
            right: 100,
            bottom: 38,
            zIndex: 1050,
          }}
          onClick={() => setBubbleOpen(true)}
        >
          重看态势汇报
        </Button>
      )}
    </div>
  );
};

export default OverviewV31;