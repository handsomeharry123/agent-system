import { Card, Row, Col, Typography, Space, Badge, Tag, Empty, Statistic, Button, Result, Tabs, Grid } from 'antd';
import {
  AlertOutlined,
  LineChartOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  NotificationOutlined,
  RobotOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  DashboardOutlined,
  SafetyCertificateOutlined,
  FundOutlined,
  PlusOutlined,
  SolutionOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  UserOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const { Text } = Typography;
const { useBreakpoint } = Grid;

// V1.5：Tab 列表统一 6 条
const LIST_VISIBLE_COUNT = 6;

// Mock data - 待办事项（平台管理员）
const platformAdminTodosAll = [
  { id: 1, type: '审批', title: '待审批注册申请', desc: '心电图智能辅助诊断系统', urgent: true, time: '10分钟前' },
  { id: 2, type: '告警', title: '待处理告警', desc: '处方审核系统响应时间异常', urgent: true, time: '30分钟前' },
  { id: 3, type: '审批', title: '待审批注销', desc: '影像分析系统 v2.1 注销申请', urgent: false, time: '1小时前' },
  { id: 4, type: '审批', title: '待审批数据共享', desc: '病历数据共享至科研平台申请', urgent: false, time: '1.5小时前' },
  { id: 5, type: '评测', title: '待评测任务', desc: '智能病历生成系统 v3.0', urgent: false, time: '2小时前' },
  { id: 6, type: '反馈', title: '待处理用户反馈工单', desc: '医生反馈诊断建议准确率低', urgent: false, time: '3小时前' },
  { id: 7, type: '审批', title: '待审批规则变更', desc: '心电数据采集规则 v2.3', urgent: false, time: '4小时前' },
];

// Mock data - 待办事项（科室管理员）
const deptAdminTodosAll = [
  { id: 1, type: '失败', title: '对接失败待修正', desc: '智能导诊系统 API 连接异常', urgent: true, time: '10分钟前' },
  { id: 2, type: '建议', title: '转交的优化建议', desc: '处方审核系统响应速度优化', urgent: false, time: '30分钟前' },
  { id: 3, type: '告警', title: '本科室告警通知', desc: '影像分析系统调用量异常增长', urgent: false, time: '1小时前' },
];

// Mock data - 系统通知
const notificationsAll = [
  { id: 1, type: 'success', title: '智能体上线审批通过', desc: '心电图智能辅助诊断系统已正式上线', time: '10分钟前' },
  { id: 2, type: 'info', title: '评测任务完成通知', desc: '胸部 CT 影像分析平台评测已完成', time: '30分钟前' },
  { id: 3, type: 'warning', title: '系统维护公告', desc: '6月10日 02:00-04:00 进行系统维护', time: '1小时前' },
  { id: 4, type: 'warning', title: '异常告警', desc: '处方审核系统响应时间异常', time: '2小时前' },
  { id: 5, type: 'info', title: '新功能上线', desc: '多智能体编排功能已上线', time: '3小时前' },
  { id: 6, type: 'success', title: '数据共享审批通过', desc: '病历数据共享至科研平台申请', time: '4小时前' },
];

// Mock data - 最近操作（V1.5：Tab 统一 6 条）
const recentOperationsAll = [
  { id: 1, action: '审批通过了"心电图智能辅助诊断系统"', target: '智能体接入中心', time: '2026-06-04 10:30' },
  { id: 2, action: '发起了"影像分析系统"的注销申请', target: '智能体接入中心', time: '2026-06-04 09:15' },
  { id: 3, action: '配置了"门诊一站式辅助"编排流程', target: '编排协同中心', time: '2026-06-03 18:20' },
  { id: 4, action: '查看了"心内科"监控数据', target: '运行监控中心', time: '2026-06-03 16:45' },
  { id: 5, action: '发布了"用药审核系统 v2.0"', target: '评测沙盒', time: '2026-06-03 14:30' },
  { id: 6, action: '处理了安全风险告警', target: '安全治理中心', time: '2026-06-03 11:20' },
  { id: 7, action: '新增了一条优化建议', target: '运行监控中心', time: '2026-06-03 10:00' },
  { id: 8, action: '审核通过了数据共享申请', target: '数据资产中心', time: '2026-06-02 17:30' },
  { id: 9, action: '导入了"心电数据集"标准数据', target: '数据资产中心', time: '2026-06-02 15:10' },
  { id: 10, action: '配置了智能体告警规则', target: '运行监控中心', time: '2026-06-02 09:45' },
];

// 快捷入口配置 - 按角色区分
const quickAccessConfig: Record<string, Array<{ name: string; icon: React.ReactNode; path: string; color: string }>> = {
  '信息科管理员': [
    { name: '智能体接入中心', icon: <RobotOutlined />, path: '/app/agent-center', color: '#52C41A' },
    { name: '统一台账中心', icon: <DatabaseOutlined />, path: '/app/ledger', color: '#FA8C16' },
    { name: '评测沙盒', icon: <ExperimentOutlined />, path: '/app/evaluation', color: '#722ED1' },
    { name: '运行监控中心', icon: <DashboardOutlined />, path: '/app/monitoring', color: '#13C2C2' },
    { name: '安全治理中心', icon: <SafetyCertificateOutlined />, path: '/app/security', color: '#F5222D' },
    { name: '数据资产中心', icon: <FundOutlined />, path: '/app/data-asset', color: '#A0D911' },
    { name: '用户中心', icon: <UserOutlined />, path: '/app/user-center', color: '#2F54EB' },
    { name: '审计中心', icon: <AuditOutlined />, path: '/app/audit', color: '#EB2F96' },
  ],
};

const HomePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const screens = useBreakpoint();

  // V1.6：跟踪当前 Tab 激活项 —— 用于右上角"查看全部"链接按当前 Tab 跳转
  const [activeHomeTab, setActiveHomeTab] = useState<string>('todo');
  const homeTabViewAllMap: Record<string, { to: string; text: string }> = {
    todo: { to: '/app/audit', text: '查看已处理' },
    notification: { to: '/app/notifications', text: '查看全部' },
    operation: { to: '/app/audit', text: '查看全部' },
  };

  // 根据用户角色判断（V1.1：多角色 — 任一命中即 true）
  const isItAdmin = currentUser?.roles.includes('信息科管理员') ?? false;

  const currentRole = currentUser?.roles[0] || '信息科管理员';
  const quickAccess = quickAccessConfig[currentRole] || quickAccessConfig['信息科管理员'];

  // V1.5：Tab 统一展示前 6 条
  const todoItemsAll = isItAdmin ? platformAdminTodosAll : deptAdminTodosAll;
  const todoItems = todoItemsAll.slice(0, LIST_VISIBLE_COUNT);
  const notifications = notificationsAll.slice(0, LIST_VISIBLE_COUNT);
  const recentOperations = recentOperationsAll.slice(0, LIST_VISIBLE_COUNT);

  // 统计数据（仅信息科管理员可见）
  const stats = {
    pendingAlerts: 3,
    abnormalAgents: 2,
    todayCalls: 12856,
  };

  const getTodoTag = (type: string) => {
    const map: Record<string, { color: string; text: string }> = {
      '审批': { color: 'blue', text: '审批' },
      '告警': { color: 'red', text: '告警' },
      '评测': { color: 'purple', text: '评测' },
      '反馈': { color: 'orange', text: '反馈' },
      '失败': { color: 'red', text: '失败' },
      '建议': { color: 'cyan', text: '建议' },
    };
    return map[type] || { color: 'default', text: type };
  };

  // 跳转数据大屏（仅平台管理员）
  const goToDashboard = () => navigate('/app/home/dashboard');

  // V1.5：响应式断点 < 992px 时上下堆叠
  const isStacked = !screens.lg;

  // V1.5：快捷入口卡（横向矩形 2:1，左图标 + 右文字，高度由 Grid 1fr 拉伸）
  const QuickAccessItem = ({ item }: { item: { name: string; icon: React.ReactNode; path: string; color: string } }) => (
    <Card
      hoverable
      bordered={false}
      style={{ cursor: 'pointer', height: '100%' }}
      onClick={() => navigate(item.path)}
      styles={{ body: { padding: '10px 14px', height: '100%', boxSizing: 'border-box' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: '100%' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: `${item.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            color: item.color,
            flexShrink: 0,
          }}
        >
          {item.icon}
        </div>
        <Text style={{ fontSize: 13, lineHeight: 1.3 }} ellipsis>{item.name}</Text>
      </div>
    </Card>
  );

  // V1.6：Tab 内列表项 —— flex 列让 6 条目均分 Tab 可用高度
  // 必须 height: 100% + overflow: hidden，否则 tabpane 内容会撑开高度导致行高异常
  const renderTabBody = (
    ListComponent: React.ReactNode,
    hasData: boolean,
  ) => (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {hasData ? ListComponent : <Empty description="暂无数据" style={{ marginTop: 40 }} />}
    </div>
  );

  // V1.6：用 CSS Grid 强制均分高度，6 行 = 1fr，规避 flex 链路中间节点坍陷导致换 tab 布局跳动
  const todoList = (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: `repeat(${todoItems.length}, 1fr)`,
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {todoItems.map((item) => (
        <div
          key={item.id}
          onClick={() => navigate('/app/agent-center')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 20px',
            cursor: 'pointer',
            borderBottom: '1px dashed #f0f0f0',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {item.urgent ? (
            <ExclamationCircleOutlined style={{ fontSize: 16, color: '#FF4D4F', flexShrink: 0 }} />
          ) : (
            <ClockCircleOutlined style={{ fontSize: 16, color: '#1677FF', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag color={getTodoTag(item.type).color} style={{ marginRight: 0, flexShrink: 0 }}>
                {getTodoTag(item.type).text}
              </Tag>
              <Text strong style={{ fontSize: 13 }} ellipsis>{item.title}</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                {item.desc}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>{item.time}</Text>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const notificationList = (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: `repeat(${notifications.length}, 1fr)`,
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {notifications.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 20px',
            cursor: 'pointer',
            borderBottom: '1px dashed #f0f0f0',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {item.type === 'success' ? (
            <CheckCircleOutlined style={{ fontSize: 16, color: '#52C41A', flexShrink: 0 }} />
          ) : item.type === 'warning' ? (
            <WarningOutlined style={{ fontSize: 16, color: '#FAAD14', flexShrink: 0 }} />
          ) : (
            <NotificationOutlined style={{ fontSize: 16, color: '#1677FF', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <Text style={{ fontSize: 13 }} ellipsis>{item.title}</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                {item.desc}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>{item.time}</Text>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const operationList = (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: `repeat(${recentOperations.length}, 1fr)`,
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {recentOperations.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 20px',
            borderBottom: '1px dashed #f0f0f0',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <ClockCircleOutlined style={{ color: '#999', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <Text style={{ fontSize: 13 }} ellipsis>{item.action}</Text>
            <div style={{ marginTop: 2 }}>
              <Text type="secondary" style={{ fontSize: 11 }}>{item.time}</Text>
            </div>
          </div>
          <Tag color="blue" style={{ fontSize: 11, marginRight: 0, flexShrink: 0 }}>{item.target}</Tag>
        </div>
      ))}
    </div>
  );

  return (
    // V1.6：主内容区 height 而非 min-height，首屏铺满不留白；overflow:hidden 防止子项溢出导致整体出现滚动条
    <div
      style={{
        padding: 16,
        background: '#F5F5F5',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden',
      }}
    >
      {/* 区域一 · 数据指标（顶部 100% 宽，约 120-140px 自然高，仅信息科管理员可见） */}
      {isItAdmin && (
        <Card
          bordered={false}
          style={{ flex: '0 0 auto' }}
          title={<Text strong>数据指标</Text>}
          extra={
            <Button type="link" onClick={goToDashboard}>
              查看详细数据 <ArrowRightOutlined />
            </Button>
          }
          styles={{ body: { padding: 16 } }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card
                bordered={false}
                style={{ background: '#FFF2F0', border: '1px solid #FFCCC7', cursor: 'pointer' }}
                onClick={goToDashboard}
                styles={{ body: { padding: 16 } }}
              >
                <Statistic
                  title={<Text type="secondary">待处理告警</Text>}
                  value={stats.pendingAlerts}
                  suffix="条"
                  prefix={<AlertOutlined style={{ color: '#FF4D4F', fontSize: 24 }} />}
                  valueStyle={{ color: '#FF4D4F', fontSize: 24 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                bordered={false}
                style={{ background: '#FFFBE6', border: '1px solid #FFE58F', cursor: 'pointer' }}
                onClick={goToDashboard}
                styles={{ body: { padding: 16 } }}
              >
                <Statistic
                  title={<Text type="secondary">异常智能体</Text>}
                  value={stats.abnormalAgents}
                  suffix="个"
                  prefix={<ExclamationCircleOutlined style={{ color: '#FAAD14', fontSize: 24 }} />}
                  valueStyle={{ color: '#FAAD14', fontSize: 24 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                bordered={false}
                style={{ background: '#F6FFED', border: '1px solid #B7EB8F', cursor: 'pointer' }}
                onClick={goToDashboard}
                styles={{ body: { padding: 16 } }}
              >
                <Statistic
                  title={<Text type="secondary">今日调用量</Text>}
                  value={stats.todayCalls}
                  suffix="次"
                  prefix={<LineChartOutlined style={{ color: '#52C41A', fontSize: 24 }} />}
                  valueStyle={{ color: '#52C41A', fontSize: 24 }}
                />
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* V1.5：下半区 Row align="stretch" 撑满剩余高度；两侧 Card height: 100% 与首屏底边齐平 */}
      <Row
        gutter={16}
        align="stretch"
        style={{ flex: 1, marginTop: 12 }}
      >
        {isStacked ? (
          <>
            {/* 响应式堆叠：区域三 优先在上 */}
            <Col xs={24}>
              <Card
                bordered={false}
                style={{ height: 400, display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1, padding: 0, minHeight: 0 } }}
              >
                <Tabs
                  className="home-tab-fill"
                  defaultActiveKey="todo"
                  activeKey={activeHomeTab}
                  onChange={setActiveHomeTab}
                  destroyInactiveTabPane={false}
                  tabBarStyle={{ marginBottom: 0, paddingLeft: 16, paddingRight: 16 }}
                  tabBarExtraContent={
                    <Button
                      type="link"
                      size="small"
                      style={{ fontSize: 12 }}
                      onClick={() => navigate(homeTabViewAllMap[activeHomeTab].to)}
                    >
                      {homeTabViewAllMap[activeHomeTab].text} <ArrowRightOutlined />
                    </Button>
                  }
                  items={[
                    {
                      key: 'todo',
                      label: (
                        <Space size={6}>
                          待办事项
                          <Badge count={todoItemsAll.length} style={{ backgroundColor: '#1677FF' }} />
                        </Space>
                      ),
                      children: renderTabBody(todoList, todoItems.length > 0),
                    },
                    {
                      key: 'notification',
                      label: (
                        <Space size={6}>
                          系统通知
                          <Badge count={notificationsAll.length} style={{ backgroundColor: '#52C41A' }} />
                        </Space>
                      ),
                      children: renderTabBody(notificationList, notifications.length > 0),
                    },
                    {
                      key: 'operation',
                      label: '最近操作',
                      children: renderTabBody(operationList, recentOperations.length > 0),
                    },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} style={{ marginTop: 12 }}>
              <Card bordered={false} title={<Text strong>快捷入口</Text>}>
                <Row gutter={[12, 12]}>
                  {quickAccess.map((item, index) => (
                    <Col xs={12} sm={12} key={index}>
                      <QuickAccessItem item={item} />
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </>
        ) : (
          <>
            {/* V1.5：区域二 · 快捷入口 —— Card 用 flex-column 让 body 自动占满 header 之外的剩余空间 */}
            <Col xs={24} lg={10}>
              <Card
                bordered={false}
                title={<Text strong>快捷入口</Text>}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1, padding: 16, minHeight: 0, overflow: 'hidden' } }}
              >
                {/* V1.5：CSS Grid 2 列 × N 行，gridAutoRows: 1fr 强制行间均分高度（兼容 8 项 4 行 / 6 项 3 行） */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gridAutoRows: '1fr',
                    gap: 12,
                    height: '100%',
                  }}
                >
                  {quickAccess.map((item, index) => (
                    <QuickAccessItem item={item} key={index} />
                  ))}
                </div>
              </Card>
            </Col>

            {/* V1.5：区域三 · Tab 容器 —— Card 用 flex 列、body flex:1+minHeight:0；Tabs 用 home-tab-fill 贯通 100% 高度 */}
            <Col xs={24} lg={14}>
              <Card
                bordered={false}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                styles={{ body: { flex: 1, padding: 0, minHeight: 0 } }}
              >
                <Tabs
                  className="home-tab-fill"
                  defaultActiveKey="todo"
                  activeKey={activeHomeTab}
                  onChange={setActiveHomeTab}
                  destroyInactiveTabPane={false}
                  tabBarStyle={{ marginBottom: 0, paddingLeft: 16, paddingRight: 16 }}
                  tabBarExtraContent={
                    <Button
                      type="link"
                      size="small"
                      style={{ fontSize: 12 }}
                      onClick={() => navigate(homeTabViewAllMap[activeHomeTab].to)}
                    >
                      {homeTabViewAllMap[activeHomeTab].text} <ArrowRightOutlined />
                    </Button>
                  }
                  items={[
                    {
                      key: 'todo',
                      label: (
                        <Space size={6}>
                          待办事项
                          <Badge count={todoItemsAll.length} style={{ backgroundColor: '#1677FF' }} />
                        </Space>
                      ),
                      children: renderTabBody(todoList, todoItems.length > 0),
                    },
                    {
                      key: 'notification',
                      label: (
                        <Space size={6}>
                          系统通知
                          <Badge count={notificationsAll.length} style={{ backgroundColor: '#52C41A' }} />
                        </Space>
                      ),
                      children: renderTabBody(notificationList, notifications.length > 0),
                    },
                    {
                      key: 'operation',
                      label: '最近操作',
                      children: renderTabBody(operationList, recentOperations.length > 0),
                    },
                  ]}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>
    </div>
  );
};

export default HomePage;
