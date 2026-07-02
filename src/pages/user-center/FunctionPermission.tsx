import { useState, useMemo } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Collapse,
  Space,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import { ReloadOutlined, SaveOutlined, AuditOutlined } from '@ant-design/icons';
import type { UserRole } from '../../types/user';
import { useAuth } from '../../hooks/useAuth';
import PageHeader from '../../components/PageHeader';
import { roleColorMap, systemRoles } from './constants';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'approve';

interface Operation {
  key: PermissionAction;
  label: string;
}

interface Page {
  key: string;
  name: string;
  operations: Operation[];
}

interface ModuleDef {
  key: string;
  name: string;
  pages: Page[];
}

/* ---------- V1.1 文档：模块-页面-操作三级树 ---------- */
const modules: ModuleDef[] = [
  {
    key: 'agent',
    name: '智能体中心',
    pages: [
      {
        key: 'list',
        name: '智能体列表',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'create', label: '创建' },
          { key: 'update', label: '编辑' },
          { key: 'delete', label: '删除' },
        ],
      },
      {
        key: 'access',
        name: '接入申请',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'approve', label: '审批' },
        ],
      },
    ],
  },
  {
    key: 'ledger',
    name: '台账中心',
    pages: [
      {
        key: 'list',
        name: '台账列表',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'update', label: '编辑' },
        ],
      },
    ],
  },
  {
    key: 'evaluation',
    name: '评测中心',
    pages: [
      {
        key: 'indicators',
        name: '评测指标',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'create', label: '创建' },
          { key: 'update', label: '编辑' },
          { key: 'delete', label: '删除' },
        ],
      },
      {
        key: 'sandbox',
        name: '评测沙盒',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'create', label: '创建' },
          { key: 'approve', label: '审批' },
        ],
      },
    ],
  },
  {
    key: 'orchestration',
    name: '编排中心',
    pages: [
      {
        key: 'scenes',
        name: '场景管理',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'create', label: '创建' },
          { key: 'update', label: '编辑' },
          { key: 'delete', label: '删除' },
        ],
      },
      {
        key: 'flows',
        name: '流程管理',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'create', label: '创建' },
          { key: 'update', label: '编辑' },
          { key: 'delete', label: '删除' },
          { key: 'approve', label: '审批' },
        ],
      },
    ],
  },
  {
    key: 'monitoring',
    name: '监控中心',
    pages: [
      {
        key: 'home',
        name: '监控首页',
        operations: [{ key: 'view', label: '查看' }],
      },
      {
        key: 'alerts',
        name: '统一告警',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'update', label: '处理' },
          { key: 'approve', label: '审批' },
        ],
      },
    ],
  },
  {
    key: 'security',
    name: '安全中心',
    pages: [
      {
        key: 'overview',
        name: '安全总览',
        operations: [{ key: 'view', label: '查看' }],
      },
      {
        key: 'risk',
        name: '风险处置',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'update', label: '处置' },
        ],
      },
    ],
  },
  {
    key: 'data-asset',
    name: '数据资产',
    pages: [
      {
        key: 'overview',
        name: '资产总览',
        operations: [{ key: 'view', label: '查看' }],
      },
      {
        key: 'list',
        name: '资产列表',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'update', label: '编辑' },
          { key: 'delete', label: '删除' },
        ],
      },
    ],
  },
  {
    key: 'user-center',
    name: '用户中心',
    pages: [
      {
        key: 'users',
        name: '用户列表',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'create', label: '创建' },
          { key: 'update', label: '编辑' },
          { key: 'delete', label: '删除' },
        ],
      },
      {
        key: 'roles',
        name: '角色管理',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'create', label: '创建' },
          { key: 'update', label: '编辑' },
          { key: 'delete', label: '删除' },
        ],
      },
    ],
  },
  {
    key: 'audit',
    name: '审计中心',
    pages: [
      {
        key: 'logs',
        name: '审计日志',
        operations: [
          { key: 'view', label: '查看' },
          { key: 'create', label: '导出' },
        ],
      },
    ],
  },
];

/* ---------- 角色列表：2 类系统默认 + 自定义角色 ---------- */
const customRoleNames: UserRole[] = ['临床科室联络员' as UserRole, '审计专员' as UserRole];
const allRoles: UserRole[] = [...systemRoles, ...customRoleNames];

/* ---------- 默认权限（信息科管理员 = 全量；其他 = 仅 view 且不能访问用户中心） ---------- */
// 注：用 string 索引以同时容纳系统默认角色与自定义角色
const defaultPerm: Record<string, Record<string, boolean>> = {
  '信息科管理员': {},
  '科室管理员': {},
  '临床科室联络员': {},
  '审计专员': {},
};
modules.forEach((m) => {
  // 信息科管理员：全部权限
  defaultPerm['信息科管理员'][m.key] = true;
  // 科室管理员：仅 view（且不能访问用户中心）
  defaultPerm['科室管理员'][m.key] = m.key === 'user-center' ? false : true;
  // 自定义角色默认 view
  defaultPerm['临床科室联络员'][m.key] = true;
  defaultPerm['审计专员'][m.key] = m.key === 'audit';
});

/* ---------- 操作权限状态 ---------- */
interface PermissionState {
  [role: string]: {
    [module: string]: {
      [page: string]: {
        [operation: string]: boolean;
      };
    };
  };
}

const initState = (): PermissionState => {
  const state: PermissionState = {};
  allRoles.forEach((role) => {
    state[role] = {};
    modules.forEach((mod) => {
      state[role][mod.key] = {};
      mod.pages.forEach((pg) => {
        state[role][mod.key][pg.key] = {};
        pg.operations.forEach((op) => {
          state[role][mod.key][pg.key][op.key] =
            op.key === 'view' && defaultPerm[role][mod.key] !== false;
        });
      });
    });
  });
  return state;
};

const FunctionPermission = () => {
  const { currentUser } = useAuth();
  // V1.1：顶部多选角色
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([...systemRoles]);
  const [permissions, setPermissions] = useState<PermissionState>(initState);
  const [activeModules, setActiveModules] = useState<string[]>(modules.map((m) => m.key));

  const isItAdmin = currentUser?.roles.includes('信息科管理员') ?? false;

  const allSelected = selectedRoles.length > 0;

  /* ---------- 切换模块（仅更新激活的折叠面板） ---------- */
  const handleToggleModule = (key: string | string[]) => {
    setActiveModules(typeof key === 'string' ? [key] : key);
  };

  /* ---------- 写入权限：对所有选中角色同步生效 ---------- */
  const updatePerm = (
    role: UserRole,
    moduleKey: string,
    pageKey: string,
    operationKey: PermissionAction,
    checked: boolean,
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [moduleKey]: {
          ...prev[role][moduleKey],
          [pageKey]: {
            ...prev[role][moduleKey][pageKey],
            [operationKey]: checked,
          },
        },
      },
    }));
  };

  const handleOperationChange = (
    role: UserRole,
    mod: ModuleDef,
    page: Page,
    op: Operation,
    checked: boolean,
  ) => {
    if (!isItAdmin || !allSelected) return;
    updatePerm(role, mod.key, page.key, op.key, checked);
  };

  const handlePageToggle = (
    role: UserRole,
    mod: ModuleDef,
    page: Page,
    checked: boolean,
  ) => {
    if (!isItAdmin || !allSelected) return;
    setPermissions((prev) => {
      const next = { ...prev };
      next[role] = {
        ...next[role],
        [mod.key]: {
          ...next[role][mod.key],
          [page.key]: {},
        },
      };
      if (checked) {
        page.operations.forEach((op) => {
          next[role][mod.key][page.key][op.key] = true;
        });
      }
      return next;
    });
  };

  const handleModuleToggle = (role: UserRole, mod: ModuleDef, checked: boolean) => {
    if (!isItAdmin || !allSelected) return;
    setPermissions((prev) => {
      const next = { ...prev };
      next[role] = {
        ...next[role],
        [mod.key]: {},
      };
      if (checked) {
        mod.pages.forEach((pg) => {
          next[role][mod.key][pg.key] = {};
          pg.operations.forEach((op) => {
            next[role][mod.key][pg.key][op.key] = true;
          });
        });
      }
      return next;
    });
  };

  const handleReset = () => {
    if (!isItAdmin) {
      message.warning('仅信息科管理员可修改权限');
      return;
    }
    setPermissions(initState());
    message.success('权限配置已重置为默认值');
  };

  const handleSave = () => {
    if (!isItAdmin) {
      message.warning('仅信息科管理员可修改权限');
      return;
    }
    // 模拟审计日志
    message.success('功能权限配置已保存（已记入审计日志）');
  };

  /* ---------- 矩阵数据：行 = 模块 → 页面 → 操作 ---------- */
  type Row =
    | { kind: 'module'; mod: ModuleDef }
    | { kind: 'page'; mod: ModuleDef; page: Page }
    | { kind: 'op'; mod: ModuleDef; page: Page; op: Operation };

  const buildRows = (mod: ModuleDef): Row[] => {
    const rows: Row[] = [{ kind: 'module', mod }];
    mod.pages.forEach((page) => {
      rows.push({ kind: 'page', mod, page });
      page.operations.forEach((op) => {
        rows.push({ kind: 'op', mod, page, op });
      });
    });
    return rows;
  };

  /* ---------- 列：模块/页面/操作名 + 每个选中角色一列 ---------- */
  const columns: ColumnsType<Row> = [
    {
      title: '功能模块 / 页面 / 操作',
      dataIndex: 'kind',
      key: 'name',
      width: 220,
      render: (_, record) => {
        if (record.kind === 'module') {
          const { total, enabled } = getModuleStats(selectedRoles, record.mod, permissions);
          const checked = enabled === total && total > 0;
          const indeterminate = enabled > 0 && enabled < total;
          return (
            <Space>
              <Checkbox
                checked={checked}
                indeterminate={indeterminate}
                disabled={!isItAdmin}
                onChange={(e) => {
                  if (!isItAdmin) return;
                  selectedRoles.forEach((r) => handleModuleToggle(r, record.mod, e.target.checked));
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <Text strong>{record.mod.name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>（{enabled}/{total}）</Text>
            </Space>
          );
        }
        if (record.kind === 'page') {
          const { total, enabled } = getPageStats(selectedRoles, record.mod, record.page, permissions);
          const checked = enabled === total && total > 0;
          const indeterminate = enabled > 0 && enabled < total;
          return (
            <Space style={{ paddingLeft: 24 }}>
              <Checkbox
                checked={checked}
                indeterminate={indeterminate}
                disabled={!isItAdmin}
                onChange={(e) => {
                  if (!isItAdmin) return;
                  selectedRoles.forEach((r) =>
                    handlePageToggle(r, record.mod, record.page, e.target.checked),
                  );
                }}
              />
              <Text>{record.page.name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>（{enabled}/{total}）</Text>
            </Space>
          );
        }
        return (
          <Text type="secondary" style={{ paddingLeft: 56 }}>└ {record.op.label}</Text>
        );
      },
    },
    ...(selectedRoles.length > 0
      ? selectedRoles.map((role) => ({
          title: () => <Tag color={roleColorMap[role] || 'default'}>{role}</Tag>,
          key: role,
          width: 120,
          align: 'center' as const,
          render: (_: any, record: Row) => {
            if (!isItAdmin) return <Checkbox checked={false} disabled />;
            if (record.kind === 'module') {
              const { total, enabled } = getModuleStats([role], record.mod, permissions);
              const checked = enabled === total && total > 0;
              const indeterminate = enabled > 0 && enabled < total;
              return (
                <Checkbox
                  checked={checked}
                  indeterminate={indeterminate}
                  onChange={(e) => handleModuleToggle(role, record.mod, e.target.checked)}
                />
              );
            }
            if (record.kind === 'page') {
              const { total, enabled } = getPageStats([role], record.mod, record.page, permissions);
              const checked = enabled === total && total > 0;
              const indeterminate = enabled > 0 && enabled < total;
              return (
                <Checkbox
                  checked={checked}
                  indeterminate={indeterminate}
                  onChange={(e) => handlePageToggle(role, record.mod, record.page, e.target.checked)}
                />
              );
            }
            const checked = !!permissions[role]?.[record.mod.key]?.[record.page.key]?.[record.op.key];
            return (
              <Checkbox
                checked={checked}
                onChange={(e: CheckboxChangeEvent) =>
                  handleOperationChange(role, record.mod, record.page, record.op, e.target.checked)
                }
              />
            );
          },
        }))
      : []),
  ];

  return (
    <div style={{ padding: 24, background: '#F5F5F5' }}>
      <PageHeader
        title="功能权限配置"
        subTitle="以角色 × 功能模块矩阵形式配置功能权限（模块-页面-操作三级）"
        extra={[
          <Button key="reset" icon={<ReloadOutlined />} onClick={handleReset} disabled={!isItAdmin}>
            重置
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            disabled={!isItAdmin}
          >
            保存配置
          </Button>,
        ]}
      />

      <Alert
        type="info"
        showIcon
        icon={<AuditOutlined />}
        message="授权粒度：角色 × 模块 × 页面 × 操作"
        description={
          <Space direction="vertical" size={2}>
            <span>• 顶部下拉可多选角色，对所有选中角色的权限同步生效</span>
            <span>• 同一用户拥有多个角色时，运行时取并集</span>
            <span>• 保存动作将记入审计日志</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      />

      <Card style={{ marginBottom: 16 }}>
        <Space wrap size={[16, 8]} align="center">
          <Text strong>选择角色：</Text>
          <Select
            mode="multiple"
            value={selectedRoles}
            onChange={(v) => setSelectedRoles(v as UserRole[])}
            style={{ minWidth: 360, maxWidth: 720 }}
            placeholder="选择一个或多个角色"
            options={allRoles.map((r) => ({ label: r, value: r }))}
            maxTagCount="responsive"
          />
          <Text type="secondary">已选 {selectedRoles.length} 个角色</Text>
        </Space>
      </Card>

      <Card title={<Text strong>功能权限矩阵</Text>}>
        {selectedRoles.length === 0 ? (
          <Paragraph type="secondary" style={{ textAlign: 'center', padding: '32px 0' }}>
            请先在上方选择至少一个角色
          </Paragraph>
        ) : (
          <Collapse activeKey={activeModules} onChange={handleToggleModule} ghost>
            {modules.map((mod) => {
              const rows = buildRows(mod);
              return (
                <Panel
                  key={mod.key}
                  header={
                    <Text strong style={{ fontSize: 14 }}>{mod.name}</Text>
                  }
                >
                  <Table
                    columns={columns}
                    dataSource={rows.map((r, i) => ({ ...r, _key: `${mod.key}-${i}` }))}
                    rowKey="_key"
                    pagination={false}
                    size="small"
                    showHeader={true}
                    bordered
                  />
                </Panel>
              );
            })}
          </Collapse>
        )}
      </Card>
    </div>
  );
};

/* ---------- 工具：根据角色集合统计模块/页面勾选数 ---------- */
function getModuleStats(
  roles: UserRole[],
  mod: ModuleDef,
  perms: PermissionState,
): { total: number; enabled: number } {
  let total = 0;
  let enabled = 0;
  mod.pages.forEach((pg) => {
    pg.operations.forEach((op) => {
      total += roles.length;
      roles.forEach((r) => {
        if (perms[r]?.[mod.key]?.[pg.key]?.[op.key]) enabled++;
      });
    });
  });
  return { total, enabled };
}

function getPageStats(
  roles: UserRole[],
  mod: ModuleDef,
  page: Page,
  perms: PermissionState,
): { total: number; enabled: number } {
  let total = 0;
  let enabled = 0;
  page.operations.forEach((op) => {
    total += roles.length;
    roles.forEach((r) => {
      if (perms[r]?.[mod.key]?.[page.key]?.[op.key]) enabled++;
    });
  });
  return { total, enabled };
}

export default FunctionPermission;
