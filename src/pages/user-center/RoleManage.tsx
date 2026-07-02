import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import {
  CrownOutlined,
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyOutlined,
  TeamOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { UserRole } from '../../types/user';
import { mockUsers } from '../../mock/users';
import { useAuth } from '../../hooks/useAuth';
import PageHeader from '../../components/PageHeader';
import { roleColorMap } from './constants';

const { Text } = Typography;

/* ---------- 角色类型 ---------- */
interface Role {
  id: string;
  name: UserRole;
  description: string;
  userCount: number;
  isSystem: boolean;
  /** 是否基于已有角色复制而来（仅自定义角色关注） */
  copyFrom?: UserRole;
}

/* ---------- 系统默认角色：信息科管理员 + 科室管理员 ---------- */
const systemRoleDescriptions: Record<UserRole, string> = {
  '信息科管理员': '拥有平台全部功能与数据权限，可管理所有模块、用户与权限配置',
  '科室管理员': '负责本科室智能体的接入申请与日常管理，仅可访问本科室数据',
};

const baseRoles: Role[] = [
  { id: 'role-it-admin', name: '信息科管理员', description: systemRoleDescriptions['信息科管理员'], userCount: 0, isSystem: true },
  { id: 'role-dept-admin', name: '科室管理员', description: systemRoleDescriptions['科室管理员'], userCount: 0, isSystem: true },
];

/** 演示用的自定义角色（管理员可新增自定义角色，可删除） */
const customRoles: Role[] = [
  { id: 'role-clinic-liaison', name: '临床科室联络员' as UserRole, description: '协助科室管理员对接智能体上线，查看本科室评测报告', userCount: 0, isSystem: false, copyFrom: '科室管理员' },
  { id: 'role-auditor', name: '审计专员' as UserRole, description: '可访问审计中心全部模块，不可修改任何业务数据', userCount: 0, isSystem: false, copyFrom: '科室管理员' },
];

const roleIcons: Record<string, React.ReactNode> = {
  '信息科管理员': <CrownOutlined />,
  '科室管理员': <TeamOutlined />,
};

const RoleManage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // V1.1：用户可同时拥有多个角色 → 用 includes 判断
  const isItAdmin = currentUser?.roles.includes('信息科管理员') ?? false;

  // 动态计算每个角色下绑定的用户数
  const mockRoles: Role[] = useMemo(() => {
    const all = [...baseRoles, ...customRoles];
    return all.map((r) => ({
      ...r,
      userCount: mockUsers.filter((u) => u.roles.includes(r.name)).length,
    }));
  }, []);

  /* ---------- 行操作 ---------- */
  const handleViewDetail = (role: Role) => {
    setSelectedRole(role);
    setDetailDrawerVisible(true);
  };
  const handleViewUsers = (roleName: UserRole) => {
    navigate(`/app/user-center?role=${encodeURIComponent(roleName)}`);
  };

  const handleAdd = () => {
    setSelectedRole(null);
    form.resetFields();
    form.setFieldsValue({ copyFrom: undefined });
    setEditModalVisible(true);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    form.setFieldsValue({
      name: role.name,
      description: role.description,
      copyFrom: role.copyFrom,
    });
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (selectedRole) {
      message.success(`角色「${selectedRole.name}」已更新`);
    } else {
      // V1.1：新增自定义角色；如选了"基于已有角色复制"，提示将基于其权限创建
      const copyFrom = values.copyFrom as UserRole | undefined;
      const newName = values.name as string;
      message.success(
        copyFrom
          ? `角色「${newName}」已创建（已基于「${copyFrom}」复制功能权限）`
          : `角色「${newName}」已创建`,
      );
      // 跳到功能权限配置页继续配置
      setTimeout(() => navigate('/app/user-center/function-permission'), 600);
    }
    setEditModalVisible(false);
    form.resetFields();
  };

  const handleDelete = (role: Role) => {
    if (role.isSystem) {
      message.warning('系统默认角色不可删除');
      return;
    }
    // V1.1：仅当角色下无绑定用户时可删除
    if (role.userCount > 0) {
      message.error(`角色「${role.name}」下还有 ${role.userCount} 名用户，请先移除用户绑定`);
      return;
    }
    message.success(`角色「${role.name}」已删除`);
  };

  /* ---------- 列 ---------- */
  const columns: ProColumns<Role>[] = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name, record) => (
        <Tag
          color={roleColorMap[record.isSystem ? (name as UserRole) : '科室管理员']}
          icon={roleIcons[name as string] || <UserOutlined />}
        >
          <a onClick={() => handleViewDetail(record)} style={{ color: 'inherit' }}>{name}</a>
        </Tag>
      ),
    },
    {
      title: '角色描述',
      dataIndex: 'description',
      key: 'description',
      width: 320,
      ellipsis: true,
    },
    {
      title: '用户数',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 100,
      align: 'center',
      render: (val, record) => (
        <a onClick={() => handleViewUsers(record.name as UserRole)}>
          <TeamOutlined /> {val} 人
        </a>
      ),
    },
    {
      title: '类型',
      dataIndex: 'isSystem',
      key: 'isSystem',
      width: 110,
      align: 'center',
      render: (isSystem: boolean) => (
        <Tag color={isSystem ? 'blue' : 'default'}>
          {isSystem ? '系统默认' : '自定义'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<SafetyOutlined />}
            onClick={() => navigate('/app/user-center/function-permission')}
          >
            配置功能权限
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          {!record.isSystem && (
            <Popconfirm
              title="确认删除"
              description={
                record.userCount > 0
                  ? `角色「${record.name}」下还有 ${record.userCount} 名用户，无法删除`
                  : `确定要删除角色「${record.name}」吗？`
              }
              onConfirm={() => handleDelete(record)}
              okButtonProps={{ disabled: record.userCount > 0 }}
            >
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={record.userCount > 0}
              >
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 角色列表选项（用于"基于已有角色复制"）
  const roleOptionsForCopy = mockRoles.map((r) => ({
    label: `${r.name}${r.isSystem ? '（系统默认）' : '（自定义）'}`,
    value: r.name,
  }));

  return (
    <div style={{ padding: 24, background: '#F5F5F5', minHeight: '100%' }}>
      <PageHeader
        title="角色管理"
        subTitle="系统默认 3 类角色 + 自定义角色；管理员可新增/编辑/删除自定义角色"
        style={{ marginBottom: 16 }}
      />

      <Card bordered={false} styles={{ body: { padding: 0 } }}>
        <ProTable<Role>
          columns={columns}
          dataSource={mockRoles}
          rowKey="id"
          search={false}
          pagination={false}
          scroll={{ x: 900 }}
          toolBarRender={() => [
            isItAdmin ? (
              <Button key="add" type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                新增角色
              </Button>
            ) : null,
          ]}
        />
      </Card>

      {/* 新增 / 编辑 角色 */}
      <Modal
        title={selectedRole ? '编辑角色' : '新增角色'}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
        onOk={handleSave}
        okText={selectedRole ? '保存' : '创建并配置权限'}
        cancelText="取消"
        width={520}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="角色名称"
            rules={[
              { required: true, message: '请输入角色名称' },
              {
                validator: (_, value) => {
                  if (!value) return Promise.resolve();
                  if (mockRoles.some((r) => r.name === value && r.id !== selectedRole?.id)) {
                    return Promise.reject(new Error('角色名称不可与已有角色重名'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input placeholder="请输入角色名称" disabled={!!selectedRole?.isSystem} />
          </Form.Item>
          <Form.Item
            name="description"
            label="角色描述"
            rules={[{ required: true, message: '请输入角色描述' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入角色描述" />
          </Form.Item>
          {!selectedRole && (
            <Form.Item
              name="copyFrom"
              label={
                <Space>
                  <CopyOutlined />
                  基于已有角色复制
                </Space>
              }
              tooltip="可选择基于现有角色的功能权限作为起始模板"
            >
              <Select
                placeholder="（可选）选择一个角色作为模板"
                allowClear
                options={roleOptionsForCopy}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* 角色详情抽屉 */}
      <Drawer
        title="角色详情"
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedRole(null);
        }}
        width={560}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            {selectedRole && !selectedRole.isSystem && selectedRole.userCount === 0 && (
              <Popconfirm
                title="确认删除"
                description={`确定要删除角色「${selectedRole.name}」吗？`}
                onConfirm={() => {
                  handleDelete(selectedRole);
                  setDetailDrawerVisible(false);
                }}
              >
                <Button danger icon={<DeleteOutlined />}>删除角色</Button>
              </Popconfirm>
            )}
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                if (selectedRole) {
                  setDetailDrawerVisible(false);
                  handleEdit(selectedRole);
                }
              }}
            >
              编辑角色信息
            </Button>
            <Button icon={<SafetyOutlined />} onClick={() => navigate('/app/user-center/function-permission')}>
              配置功能权限
            </Button>
          </Space>
        }
      >
        {selectedRole && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space size={8}>
              <Tag
                color={roleColorMap[selectedRole.isSystem ? (selectedRole.name as UserRole) : '科室管理员']}
                icon={roleIcons[selectedRole.name as string] || <UserOutlined />}
                style={{ fontSize: 16, padding: '4px 12px' }}
              >
                {selectedRole.name}
              </Tag>
              <Tag color={selectedRole.isSystem ? 'blue' : 'default'}>
                {selectedRole.isSystem ? '系统默认' : '自定义'}
              </Tag>
            </Space>

            <div>
              <Text type="secondary">角色描述</Text>
              <div style={{ marginTop: 4 }}>
                <Text>{selectedRole.description}</Text>
              </div>
            </div>

            {selectedRole.copyFrom && (
              <div>
                <Text type="secondary">创建方式</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag icon={<CopyOutlined />}>基于「{selectedRole.copyFrom}」复制</Tag>
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
              <Text type="secondary">用户数量</Text>
              <div style={{ marginTop: 4 }}>
                <Text strong style={{ fontSize: 20 }}>{selectedRole.userCount}</Text>
                <Text type="secondary"> 人</Text>
                <a style={{ marginLeft: 12 }} onClick={() => handleViewUsers(selectedRole.name as UserRole)}>
                  查看全部
                </a>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>已分配用户</Text>
              {selectedRole.userCount === 0 ? (
                <Text type="secondary">暂无用户</Text>
              ) : (
                <List
                  size="small"
                  dataSource={mockUsers.filter((u) => u.roles.includes(selectedRole.name as UserRole))}
                  renderItem={(user) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar size="small" icon={<UserOutlined />} style={{ backgroundColor: '#1677FF' }} />}
                        title={user.name}
                        description={`${user.employeeId} · ${user.department}`}
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>权限概览</Text>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>功能权限</Text>
                  <Button type="link" size="small" onClick={() => navigate('/app/user-center/function-permission')}>
                    配置 / 查看 →
                  </Button>
                </div>
                <div style={{ fontSize: 12, color: '#8C8C8C' }}>
                  数据权限按组织（科室）配置：用户自动继承所属科室规则；如需例外，请前往 10-4 数据权限配置页。
                </div>
              </Space>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default RoleManage;
