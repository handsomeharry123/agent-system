import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  TreeSelect,
  Typography,
  message,
  Dropdown,
  Empty,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  CloudSyncOutlined,
  DownOutlined,
  EditOutlined,
  ExportOutlined,
  ExclamationCircleTwoTone,
  FileTextOutlined,
  MoreOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined,
  UserOutlined,
  WarningTwoTone,
} from '@ant-design/icons';
import type { User, UserRole, DataClassification, DataPermissionSource } from '../../types/user';
import { mockUsers } from '../../mock/users';
import { mockOrganizationRules } from '../../mock/organization-rules';
import { lastSync, mockSyncLog } from '../../mock/sync-log';
import { useAuth } from '../../hooks/useAuth';
import PageHeader from '../../components/PageHeader';
import { roleColorMap } from './constants';
import type { ColumnsType } from 'antd/es/table';

const { Text, Title } = Typography;
const { confirm } = Modal;

/* ---------- 同步状态条 ---------- */
const SyncStatusBar = ({ onViewLog, onSync }: { onViewLog: () => void; onSync: () => void }) => {
  const statusMap = {
    success: { color: '#52C41A', icon: <CheckCircleTwoTone twoToneColor="#52C41A" />, text: '成功' },
    partial: { color: '#FAAD14', icon: <WarningTwoTone twoToneColor="#FAAD14" />, text: '部分失败' },
    failed: { color: '#FF4D4F', icon: <CloseCircleTwoTone twoToneColor="#FF4D4F" />, text: '失败' },
  } as const;
  const s = statusMap[lastSync.result];

  return (
    <Card
      size="small"
      style={{ marginBottom: 16, background: '#FAFBFC', border: '1px solid #F0F0F0' }}
      styles={{ body: { padding: '12px 20px' } }}
    >
      <Space size={24} wrap align="center" style={{ width: '100%' }}>
        <Space>
          <CloudSyncOutlined style={{ fontSize: 18, color: '#1677FF' }} />
          <Text strong>员工同步</Text>
        </Space>
        <Space size={6}>
          <Text type="secondary">上次同步：</Text>
          <Text>{lastSync.syncAt}</Text>
        </Space>
        <Space size={6}>
          <Text type="secondary">本次：</Text>
          <Tag color="green">新增 {lastSync.added}</Tag>
          <Tag color="blue">更新 {lastSync.updated}</Tag>
          <Tag color="default">停用 {lastSync.disabled}</Tag>
        </Space>
        <Space size={6}>
          <Text type="secondary">结果：</Text>
          {s.icon}
          <Text style={{ color: s.color }}>{s.text}</Text>
        </Space>
        <Space style={{ marginLeft: 'auto' }}>
          <Button icon={<SyncOutlined />} onClick={onSync}>立即同步</Button>
          <Button type="link" icon={<FileTextOutlined />} onClick={onViewLog}>
            查看同步日志
          </Button>
        </Space>
      </Space>
    </Card>
  );
};

/* ---------- 详情抽屉里的「配置用户级覆盖」表单 ---------- */
interface OverrideFormValues {
  agentScope: 'dept' | 'all' | 'custom';
  customAgents?: string[];
  dataClassifications: DataClassification[];
  reason: string;
  expiryStrategy: 'onOrgChange' | 'byDate' | 'permanent';
  expiryDate?: string;
}

const AGENT_OPTIONS = [
  { label: '心电图智能辅助诊断系统', value: 'agent-001' },
  { label: '胸部 CT 影像智能分析平台', value: 'agent-002' },
  { label: '病历智能生成与质控系统', value: 'agent-003' },
  { label: '处方智能审核与用药安全系统', value: 'agent-004' },
  { label: '智能导诊与分诊系统', value: 'agent-005' },
  { label: '智能问诊系统', value: 'agent-006' },
  { label: '医学影像报告生成系统', value: 'agent-007' },
  { label: '慢病管理系统', value: 'agent-008' },
];

const UserList = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isItAdmin = currentUser?.roles.includes('信息科管理员') ?? false;

  // 状态
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [permissionDetailOpen, setPermissionDetailOpen] = useState(false);
  const [batchRoleModalOpen, setBatchRoleModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [tableKey, setTableKey] = useState(0); // 强制刷新表格

  // 表单
  const [roleForm] = Form.useForm();
  const [overrideForm] = Form.useForm();
  const [batchRoleForm] = Form.useForm();
  // 批量分配模式：覆盖 / 追加
  const [batchMode, setBatchMode] = useState<'override' | 'append'>('append');

  // 从 URL 读取预筛（来自角色管理 / 数据权限页的跳转）
  const urlRoleFilter = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('role');
  }, [location.search]);
  const urlDeptFilter = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('dept');
  }, [location.search]);

  // 从用户聚合成组织树（树形下拉用）
  const orgTreeData = useMemo(() => {
    const root = { value: '__root__', label: '全院', children: [] as any[] };
    mockUsers.forEach((u) => {
      if (!root.children.find((c: any) => c.value === u.department)) {
        root.children.push({ value: u.department, label: u.department });
      }
    });
    return [root];
  }, []);

  // 角色下拉选项（3 类系统默认 + 实际数据里出现的角色）
  const roleOptions = useMemo(() => {
    const set = new Set<UserRole>();
    mockUsers.forEach((u) => u.roles.forEach((r) => set.add(r)));
    return Array.from(set).map((r) => ({ label: r, value: r }));
  }, []);

  // 角色筛选项（系统默认 2 类 + 自定义）
  const roleFilterOptions = [
    { label: '信息科管理员', value: '信息科管理员' },
    { label: '科室管理员', value: '科室管理员' },
  ];

  /* ---------- 顶部操作 ---------- */
  const handleSync = () => {
    const hide = message.loading('正在同步员工信息…', 0);
    setTimeout(() => {
      hide();
      message.success('同步完成：新增 0 / 更新 0 / 停用 0');
    }, 1500);
  };

  const handleExport = () => {
    // 按当前 ProTable 筛选条件导出 CSV（mock：导出 mockUsers 全部）
    const header = ['姓名', '工号', '所属组织', '角色', '状态', '数据权限来源', '最后登录', '同步时间'];
    const rows = mockUsers.map((u) => [
      u.name,
      u.employeeId,
      u.department,
      u.roles.join(' / '),
      u.status,
      u.dataPermissionSource === 'override' ? '用户级覆盖' : '继承自 ' + u.department,
      u.lastLoginAt || '-',
      u.syncTime,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `用户清单-${lastSync.syncAt.replace(/[: ]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${rows.length} 条用户记录`);
  };

  /* ---------- 行操作 ---------- */
  const handleViewDetail = (record: User) => {
    setSelectedUser(record);
    setDetailDrawerOpen(true);
  };
  const handleViewPermission = (record: User) => {
    setSelectedUser(record);
    setPermissionDetailOpen(true);
  };
  const handleAssignRole = (record: User) => {
    setSelectedUser(record);
    roleForm.setFieldsValue({ roles: record.roles });
    setRoleModalOpen(true);
  };
  const handleOpenOverride = (record: User) => {
    setSelectedUser(record);
    overrideForm.setFieldsValue({
      agentScope: 'dept',
      dataClassifications: ['一般'],
      reason: '',
      expiryStrategy: 'onOrgChange',
    });
    setOverrideModalOpen(true);
  };

  /* ---------- 提交 ---------- */
  const handleSubmitRole = async () => {
    const values = await roleForm.validateFields();
    message.success(`已更新「${selectedUser?.name}」的角色：${(values.roles as UserRole[]).join(' / ')}`);
    setRoleModalOpen(false);
    roleForm.resetFields();
  };

  const handleSubmitOverride = async () => {
    const values = await overrideForm.validateFields();
    const u = selectedUser;
    if (!u) return;
    confirm({
      title: '确认配置用户级覆盖？',
      content: `用户「${u.name}」将突破所属组织「${u.department}」的默认规则，覆盖优先级高于组织规则。`,
      okText: '确认配置',
      cancelText: '取消',
      onOk: () => {
        message.success(`已为「${u.name}」配置用户级覆盖：${values.reason}`);
        setOverrideModalOpen(false);
        overrideForm.resetFields();
        setTableKey((k) => k + 1);
      },
    });
  };

  const handleSubmitBatchRole = async () => {
    const values = await batchRoleForm.validateFields();
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    message.success(
      `已${batchMode === 'override' ? '覆盖' : '追加'}分配角色：${(values.roles as UserRole[]).join(' / ')}（${selectedRowKeys.length} 人）`,
    );
    setBatchRoleModalOpen(false);
    batchRoleForm.resetFields();
    setSelectedRowKeys([]);
  };

  const handleViewRoleUsers = (role: UserRole) => {
    navigate(`/app/user-center?role=${encodeURIComponent(role)}`);
  };

  /* ---------- 列表列 ---------- */
  const columns: ProColumns<User>[] = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      fixed: 'left',
      render: (_, record) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677FF' }} />
          <a onClick={() => handleViewDetail(record)}>{record.name}</a>
        </Space>
      ),
    },
    {
      title: '工号',
      dataIndex: 'employeeId',
      key: 'employeeId',
      width: 110,
      render: (text) => <Text type="secondary">{text}</Text>,
    },
    {
      title: '所属组织',
      dataIndex: 'department',
      key: 'department',
      width: 130,
      render: (text) => <Tag>{text}</Tag>,
    },
    {
      title: '角色',
      dataIndex: 'roles',
      key: 'roles',
      width: 200,
      render: (_, record) => (
        <Space size={4} wrap>
          {record.roles.map((r) => (
            <Tag color={roleColorMap[r]} key={r}>{r}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '数据权限',
      key: 'dataPermission',
      width: 220,
      render: (_, record) => {
        const isOverride = record.dataPermissionSource === 'override';
        return (
          <Space direction="vertical" size={2} style={{ lineHeight: 1.4 }}>
            <Space size={4}>
              {isOverride ? (
                <Tag color="orange" icon={<SettingOutlined />}>用户级覆盖</Tag>
              ) : (
                <Tag color="green">继承自 {record.department}</Tag>
              )}
            </Space>
            <a onClick={() => handleViewPermission(record)} style={{ fontSize: 12 }}>
              查看生效详情 →
            </a>
          </Space>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (text: User['status']) => (
        <Tag color={text === '在职' ? 'success' : 'default'}>{text}</Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 160,
      render: (text) => <Text type="secondary" style={{ fontSize: 12 }}>{text || '-'}</Text>,
    },
    {
      title: '同步时间',
      dataIndex: 'syncTime',
      key: 'syncTime',
      width: 160,
      render: (text) => <Text type="secondary" style={{ fontSize: 12 }}>{text}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => {
        const items: MenuProps['items'] = [
          {
            key: 'override',
            icon: <SettingOutlined />,
            label: record.dataPermissionSource === 'override' ? '编辑用户级覆盖' : '配置用户级覆盖',
            onClick: () => handleOpenOverride(record),
          },
        ];
        return (
          <Space size={4}>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleAssignRole(record)}>
              分配角色
            </Button>
            <Button type="link" size="small" icon={<SafetyCertificateOutlined />} onClick={() => handleViewPermission(record)}>
              查看权限详情
            </Button>
            <Dropdown menu={{ items }} trigger={['click']}>
              <Button type="link" size="small">
                更多 <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  /* ---------- ProTable 工具栏：批量操作 + 导出 ---------- */
  const toolBarItems = [
    <Button key="export" icon={<ExportOutlined />} onClick={handleExport}>
      导出
    </Button>,
    <Button
      key="batch-role"
      type="primary"
      icon={<EditOutlined />}
      disabled={selectedRowKeys.length === 0}
      onClick={() => {
        batchRoleForm.resetFields();
        batchRoleForm.setFieldsValue({ roles: [] });
        setBatchRoleModalOpen(true);
      }}
    >
      批量分配角色 {selectedRowKeys.length > 0 && `(${selectedRowKeys.length})`}
    </Button>,
  ];

  return (
    <div style={{ padding: 24, background: '#F5F5F5' }}>
      <PageHeader
        title="用户列表"
        subTitle="对接医院员工系统自动同步用户与组织，支持 SSO 单点登录"
      />

      <SyncStatusBar onViewLog={() => setLogDrawerOpen(true)} onSync={handleSync} />

      <ProTable<User>
        key={tableKey}
        columns={columns}
        dataSource={mockUsers}
        rowKey="id"
        search={{
          labelWidth: 'auto',
          defaultCollapsed: false,
        }}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        rowSelection={isItAdmin ? { selectedRowKeys, onChange: setSelectedRowKeys } : undefined}
        scroll={{ x: 1500 }}
        toolBarRender={() => toolBarItems}
        onSubmit={(params) => {
          // 预筛：URL 的 ?role= 和 ?dept= 注入
          if (urlRoleFilter && !params.roles) {
            // ProTable search 不支持外部注入，这里仅在初始 render 用 useEffect 触发
          }
        }}
        dateFormatter="string"
        headerTitle="用户列表（仅信息科管理员可见）"
        // 简易搜索过滤
        request={async (params) => {
          let data = [...mockUsers];
          const { current, pageSize, ...rest } = params as any;
          if (rest.keyword) {
            const kw = String(rest.keyword).toLowerCase();
            data = data.filter(
              (u) => u.name.toLowerCase().includes(kw) || u.employeeId.toLowerCase().includes(kw),
            );
          }
          if (rest.department) {
            data = data.filter((u) => u.department === rest.department);
          }
          if (rest.roles) {
            const rs = Array.isArray(rest.roles) ? rest.roles : [rest.roles];
            data = data.filter((u) => u.roles.some((r) => rs.includes(r)));
          }
          if (rest.status) {
            data = data.filter((u) => u.status === rest.status);
          }
          if (rest.assigned === 'assigned') {
            data = data.filter((u) => u.roles.length > 0);
          } else if (rest.assigned === 'unassigned') {
            data = data.filter((u) => u.roles.length === 0);
          }
          // URL 预筛
          if (urlRoleFilter) {
            data = data.filter((u) => u.roles.includes(urlRoleFilter as UserRole));
          }
          if (urlDeptFilter) {
            data = data.filter((u) => u.department === urlDeptFilter);
          }
          return { data, success: true, total: data.length };
        }}
        columnsState={{ persistenceKey: 'user-center-list', persistenceType: 'localStorage' }}
        form={{
          initialValues: {
            roles: urlRoleFilter || undefined,
            department: urlDeptFilter || undefined,
          },
        }}
      />

      {/* 同步日志抽屉 */}
      <Drawer
        title="员工同步日志"
        open={logDrawerOpen}
        onClose={() => setLogDrawerOpen(false)}
        width={640}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {mockSyncLog.length === 0 ? (
            <Empty description="暂无同步记录" />
          ) : (
            mockSyncLog.map((log) => {
              const iconMap = {
                success: <CheckCircleTwoTone twoToneColor="#52C41A" />,
                partial: <WarningTwoTone twoToneColor="#FAAD14" />,
                failed: <CloseCircleTwoTone twoToneColor="#FF4D4F" />,
              } as const;
              return (
                <Card key={log.id} size="small">
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                      {iconMap[log.result]}
                      <Text strong>{log.syncAt}</Text>
                      <Tag color={log.result === 'success' ? 'green' : log.result === 'partial' ? 'orange' : 'red'}>
                        {log.result === 'success' ? '成功' : log.result === 'partial' ? '部分失败' : '失败'}
                      </Tag>
                    </Space>
                    <Space size={4}>
                      <Tag color="green">+{log.added}</Tag>
                      <Tag color="blue">~{log.updated}</Tag>
                      <Tag>停用 {log.disabled}</Tag>
                    </Space>
                  </Space>
                  <div style={{ marginTop: 6, color: '#595959', fontSize: 13 }}>{log.message}</div>
                </Card>
              );
            })
          )}
        </Space>
      </Drawer>

      {/* 用户详情抽屉 */}
      <Drawer
        title={selectedUser ? `用户详情 · ${selectedUser.name}` : '用户详情'}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        width={520}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                if (selectedUser) handleAssignRole(selectedUser);
              }}
            >
              分配角色
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => {
                if (selectedUser) handleOpenOverride(selectedUser);
              }}
            >
              配置用户级覆盖
            </Button>
          </Space>
        }
      >
        {selectedUser && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={5} style={{ marginTop: 0 }}>基础信息</Title>
              <Alert
                type="info"
                showIcon
                message="以上信息由医院员工系统同步，如需修改请联系医院信息科"
                style={{ marginBottom: 12 }}
              />
              <Form layout="vertical" colon={false}>
                <Form.Item label="姓名"><Input value={selectedUser.name} disabled /></Form.Item>
                <Form.Item label="工号"><Input value={selectedUser.employeeId} disabled /></Form.Item>
                <Form.Item label="所属组织"><Input value={selectedUser.department} disabled /></Form.Item>
                <Form.Item label="手机号"><Input value={selectedUser.phone} disabled /></Form.Item>
                <Form.Item label="邮箱"><Input value={selectedUser.email || '-'} disabled /></Form.Item>
                <Form.Item label="状态">
                  <Tag color={selectedUser.status === '在职' ? 'success' : 'default'}>{selectedUser.status}</Tag>
                </Form.Item>
                <Form.Item label="同步时间"><Input value={selectedUser.syncTime} disabled /></Form.Item>
              </Form>
            </div>

            <Card size="small" title="角色分配" extra={<a onClick={() => handleAssignRole(selectedUser)}>编辑</a>}>
              <Space size={4} wrap>
                {selectedUser.roles.length === 0 ? (
                  <Text type="secondary">未分配角色</Text>
                ) : (
                  selectedUser.roles.map((r) => <Tag color={roleColorMap[r]} key={r}>{r}</Tag>)
                )}
              </Space>
            </Card>

            <Card
              size="small"
              title="数据权限"
              extra={<a onClick={() => handleViewPermission(selectedUser)}>查看生效详情</a>}
            >
              <Space direction="vertical" size={4}>
                {selectedUser.dataPermissionSource === 'override' ? (
                  <Tag color="orange" icon={<SettingOutlined />}>用户级覆盖</Tag>
                ) : (
                  <Tag color="green">继承自 {selectedUser.department}</Tag>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  数据权限默认按组织配置，请在 10-4 数据权限配置页统一维护；如确需对该用户单独调整，请配置用户级覆盖。
                </Text>
              </Space>
            </Card>
          </Space>
        )}
      </Drawer>

      {/* 分配角色弹窗 */}
      <Modal
        title="分配角色"
        open={roleModalOpen}
        onCancel={() => {
          setRoleModalOpen(false);
          roleForm.resetFields();
        }}
        onOk={handleSubmitRole}
        okText="保存"
        cancelText="取消"
      >
        <Form form={roleForm} layout="vertical">
          <Form.Item
            name="roles"
            label="角色（可多选）"
            rules={[{ required: true, message: '请选择至少一个角色' }]}
          >
            <Select mode="multiple" placeholder="请选择角色" options={roleOptions} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 配置用户级覆盖弹窗 */}
      <Modal
        title={selectedUser?.dataPermissionSource === 'override' ? '编辑用户级覆盖' : '配置用户级覆盖'}
        open={overrideModalOpen}
        onCancel={() => {
          setOverrideModalOpen(false);
          overrideForm.resetFields();
        }}
        onOk={handleSubmitOverride}
        okText="保存覆盖"
        cancelText="取消"
        width={560}
      >
        <Form form={overrideForm} layout="vertical">
          <Form.Item
            name="agentScope"
            label="智能体范围"
            rules={[{ required: true, message: '请选择智能体范围' }]}
          >
            <Radio.Group>
              <Radio value="dept">本科室智能体</Radio>
              <Radio value="all">全部智能体</Radio>
              <Radio value="custom">指定智能体（增量调整）</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {() => {
              const scope = overrideForm.getFieldValue('agentScope');
              return scope === 'custom' ? (
                <Form.Item
                  name="customAgents"
                  label="指定智能体（+ 添加 / - 移除）"
                  rules={[{ required: true, message: '请选择至少一个智能体' }]}
                >
                  <Select mode="multiple" placeholder="在组织默认基础上增量调整" options={AGENT_OPTIONS} />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>
          <Form.Item
            name="dataClassifications"
            label="数据分级"
            rules={[{ required: true, message: '请选择数据分级' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择数据分级"
              options={[
                { label: '一般', value: '一般' },
                { label: '重要', value: '重要' },
                { label: '核心', value: '核心' },
                { label: '敏感', value: '敏感' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label="覆盖原因"
            rules={[{ required: true, message: '请填写覆盖原因' }]}
          >
            <Input.TextArea rows={3} placeholder="例如：MDT 多学科会诊 / 跨科调研 / 信息科测试" />
          </Form.Item>
          <Form.Item
            name="expiryStrategy"
            label="失效策略"
            rules={[{ required: true, message: '请选择失效策略' }]}
          >
            <Radio.Group>
              <Radio value="onOrgChange">随组织变动失效（推荐）</Radio>
              <Radio value="byDate">截止日期到期失效</Radio>
              <Radio value="permanent">长期有效</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item shouldUpdate noStyle>
            {() => {
              const s = overrideForm.getFieldValue('expiryStrategy');
              return s === 'byDate' ? (
                <Form.Item
                  name="expiryDate"
                  label="截止日期"
                  rules={[{ required: true, message: '请选择截止日期' }]}
                >
                  <Input type="date" />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量分配角色弹窗 */}
      <Modal
        title={`批量分配角色（${batchMode === 'override' ? '覆盖' : '追加'}）`}
        open={batchRoleModalOpen}
        onCancel={() => {
          setBatchRoleModalOpen(false);
          batchRoleForm.resetFields();
        }}
        onOk={handleSubmitBatchRole}
        okText="保存"
        cancelText="取消"
        width={480}
      >
        <Form form={batchRoleForm} layout="vertical">
          <Form.Item label="分配方式" required>
            <Radio.Group value={batchMode} onChange={(e) => setBatchMode(e.target.value)}>
              <Radio value="append">追加（在现有角色基础上新增）</Radio>
              <Radio value="override">覆盖（替换为所选角色）</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="roles"
            label="目标角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select mode="multiple" placeholder="请选择角色" options={roleOptions} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 权限详情抽屉（数据权限） */}
      <Drawer
        title={selectedUser ? `${selectedUser.name} · 数据权限详情` : '数据权限详情'}
        open={permissionDetailOpen}
        onClose={() => setPermissionDetailOpen(false)}
        width={600}
      >
        {selectedUser && <DataPermissionDetail user={selectedUser} />}
      </Drawer>
    </div>
  );
};

/* ---------- 权限详情子组件 ---------- */
const DataPermissionDetail = ({ user }: { user: User }) => {
  // 找到该用户所属组织的规则
  const orgRule = mockOrganizationRules.find((r) => r.orgName === user.department);
  const defaultRule = mockOrganizationRules.find((r) => r.isDefault)!;
  const effectiveRule = orgRule && orgRule.configured ? orgRule : defaultRule;

  const agentScopeText = (s: string) => ({
    dept: '本科室智能体',
    all: '全部智能体',
    custom: '指定智能体',
  } as const)[s as 'dept' | 'all' | 'custom'] || '-';

  const source: DataPermissionSource = user.dataPermissionSource;
  const overrideRule =
    source === 'override'
      ? {
          agentScope: 'custom' as const,
          customAgents: ['心电图智能辅助诊断系统', '胸部 CT 影像智能分析平台'],
          dataClassifications: ['一般', '重要', '核心'] as DataClassification[],
        }
      : null;

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card size="small">
        <Statistic
          title="数据权限来源"
          valueRender={() =>
            source === 'override' ? (
              <Tag color="orange" icon={<SettingOutlined />}>用户级覆盖</Tag>
            ) : (
              <Tag color="green">继承自 {user.department}</Tag>
            )
          }
        />
      </Card>

      <Card size="small" title="组织默认范围（对照参考）">
        <Space direction="vertical" size={6}>
          <Space>
            <Text type="secondary">智能体范围：</Text>
            <Tag color="blue">{agentScopeText(effectiveRule.agentScope)}</Tag>
          </Space>
          <Space wrap>
            <Text type="secondary">数据分级：</Text>
            {effectiveRule.dataClassifications.map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
          </Space>
          <div style={{ fontSize: 12, color: '#8C8C8C' }}>
            适用规则：{effectiveRule.isDefault ? '全院默认规则' : `${effectiveRule.orgName}单独配置`}
          </div>
        </Space>
      </Card>

      {overrideRule && (
        <Card
          size="small"
          title="用户级覆盖（实际生效）"
          style={{ borderColor: '#FFD591' }}
        >
          <Space direction="vertical" size={6}>
            <Space>
              <Text type="secondary">智能体范围：</Text>
              <Tag color="blue">{agentScopeText(overrideRule.agentScope)}</Tag>
            </Space>
            {overrideRule.customAgents && (
              <div>
                <Text type="secondary">指定智能体：</Text>
                <div style={{ marginTop: 4 }}>
                  <Space wrap>
                    {overrideRule.customAgents.map((a) => (
                      <Tag key={a} color="cyan">{a}</Tag>
                    ))}
                  </Space>
                </div>
              </div>
            )}
            <Space wrap>
              <Text type="secondary">数据分级：</Text>
              {overrideRule.dataClassifications.map((c) => (
                <Tag key={c}>{c}</Tag>
              ))}
            </Space>
            <Alert
              type="warning"
              showIcon
              message="覆盖优先级：用户级覆盖 &gt; 用户所属组织规则 &gt; 全院默认规则"
              style={{ marginTop: 4 }}
            />
          </Space>
        </Card>
      )}

      <div style={{ fontSize: 12, color: '#8C8C8C' }}>
        数据权限默认按组织配置，请在 10-4 数据权限配置页统一维护。
      </div>
    </Space>
  );
};

export default UserList;
