import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Checkbox, Select, Space, Tree, Typography, message } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { FolderOpenOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { systemRoles } from './constants';

const { Text } = Typography;
const leaves = (prefix: string, titles: string[]) => titles.map((title, i) => ({ key: `${prefix}:${i}`, title }));

const permissionTree: DataNode[] = [
  { key: 'home', title: '首页' },
  { key: 'assistant', title: '医小管' },
  { key: 'needs', title: '智能体建设需求管理', children: leaves('needs', ['需求管理列表页', '草稿列表页', '生成需求页']) },
  {
    key: 'access', title: '智能体接入中心', children: [
      { key: 'access:list', title: '注册管理列表页', children: leaves('access:list', ['操作：审核', '操作：撤销']) },
      ...leaves('access:tab', ['草稿 tab 页', '待审核 tab 页（审核、撤销）', '审核中 tab 页（审核、撤销）', '撤销修改 tab 页', '退回修改 tab 页', '审核通过 tab 页']),
      ...leaves('access:page', ['新建注册页', '审核注册页', '注册信息详情页']),
    ],
  },
  { key: 'ledger', title: '统一台账中心', children: leaves('ledger', ['台账总览页', '台账列表页']) },
  {
    key: 'resource', title: '医院资源管理中心', children: [
      { key: 'resource:manage', title: '资源管理', children: leaves('resource:manage', ['资源管理页', '注册资源草稿页', '注册资源页']) },
      { key: 'resource:apply', title: '资源申请管理', children: leaves('resource:apply', ['全部列表页', '草稿 tab 页', '待审核 tab 页（审核、撤销）', '审核中 tab 页（审核、撤销）', '撤销修改 tab 页', '退回修改 tab 页', '审核通过 tab 页', '申请权限页', '权限审批页', '权限申请详情页']) },
    ],
  },
  {
    key: 'evaluation', title: '统一准入评测沙盒', children: [
      { key: 'evaluation:index', title: '指标列表' },
      { key: 'evaluation:data', title: '数据集管理', children: leaves('evaluation:data', ['数据集管理页', '导入数据集页', '数据集详情页', '导入题集页']) },
      { key: 'evaluation:task', title: '评测任务管理', children: leaves('evaluation:task', ['全部列表页（审核、撤销）', '草稿列表页', '待评测列表页', '评测中列表页（撤销）', '撤销列表页', '评测完成列表页（审核）', '审核中列表页（审核）', '审核通过列表页', '退回修改列表页', '新建评测任务页', '评测结果详情页', '评测结果审核页']) },
    ],
  },
  {
    key: 'monitor', title: '统一运行监控中心', children: [
      ...leaves('monitor:overview', ['监控告警总览页', '业务监控页', '状态监控页', '成本监控页']),
      { key: 'monitor:rules', title: '告警规则管理', children: leaves('monitor:rules', ['告警规则管理页', '新建告警规则页', '告警规则详情页']) },
      { key: 'monitor:event', title: '告警事件处置', children: leaves('monitor:event', ['全部告警事件页', '待分派告警事件页', '待处理告警事件页（处理）', '处理中告警事件页', '待审核告警事件页（审核）', '审核中告警事件页（审核）', '已关闭告警事件页', '已忽略告警事件页', '告警事件分派页', '告警事件处理页', '告警事件处理审核页', '告警事件详情页']) },
    ],
  },
  {
    key: 'system', title: '系统配置', children: [
      { key: 'system:dict', title: '数据字典', children: leaves('system:dict', ['字典管理页', '创建字典页', '导入字典页', '字典项管理页', '创建字典项页', '导入字典项页']) },
      { key: 'system:model', title: '模型配置', children: leaves('system:model', ['模型管理页', '模型配置页']) },
    ],
  },
];

const flattenKeys = (nodes: DataNode[]): React.Key[] => nodes.flatMap((node) => [node.key, ...(node.children ? flattenKeys(node.children) : [])]);
const allKeys = flattenKeys(permissionTree);
const leaderKeys = allKeys.filter((key) => ['home', 'assistant', 'ledger', 'monitor'].some((prefix) => String(key).startsWith(prefix)));
const deptKeys = allKeys.filter((key) => !String(key).startsWith('system:dict') && !String(key).includes('audit'));
const defaults: Record<string, React.Key[]> = { 医院领导: leaderKeys, 信息科管理员: allKeys, 科室管理员: deptKeys };

const FunctionPermission = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || '信息科管理员';
  const [role, setRole] = useState(initialRole);
  const [checked, setChecked] = useState<React.Key[]>(defaults[initialRole] || []);
  const [activeModule, setActiveModule] = useState(String(permissionTree[0].key));
  const roles = useMemo(() => [...systemRoles, ...(!systemRoles.includes(initialRole as never) ? [initialRole] : [])], [initialRole]);
  const currentModule = permissionTree.find((item) => String(item.key) === activeModule) || permissionTree[0];
  const currentNodes = useMemo(() => currentModule.children || [currentModule], [currentModule]);
  const currentKeys = useMemo(() => flattenKeys(currentNodes), [currentNodes]);
  const currentCheckedCount = currentKeys.filter((key) => checked.includes(key)).length;
  const moduleFullyChecked = currentCheckedCount === currentKeys.length;
  const modulePartlyChecked = currentCheckedCount > 0 && !moduleFullyChecked;

  const switchRole = (value: string) => {
    setRole(value);
    setChecked(defaults[value] || []);
  };

  const checkModule = (value: boolean) => {
    setChecked((previous) => value
      ? Array.from(new Set([...previous, ...currentKeys]))
      : previous.filter((key) => !currentKeys.includes(key)));
  };

  const checkCurrentTree = (keys: React.Key[] | { checked: React.Key[] }) => {
    const nextCurrentKeys = Array.isArray(keys) ? keys : keys.checked;
    setChecked((previous) => [
      ...previous.filter((key) => !currentKeys.includes(key)),
      ...nextCurrentKeys,
    ]);
  };

  const resetRole = () => setChecked(defaults[role] || []);

  return (
    <div className="user-center-page">
      <PageHeader
        title="功能权限配置"
        subTitle="按角色勾选可访问的模块、页面及行内操作权限"
        extra={<Space><Button icon={<ReloadOutlined />} onClick={resetRole}>重置</Button><Button type="primary" icon={<SaveOutlined />} onClick={() => message.success(`「${role}」功能权限保存成功`)}>保存配置</Button></Space>}
      />
      <Card bordered={false}>
        <div className="permission-role-bar">
          <Space size={16} wrap><Text strong>配置角色</Text><Select value={role} options={roles.map((value) => ({ label: value, value }))} onChange={switchRole} style={{ width: 220 }} /><Text type="secondary">已选择 {checked.length} 项权限</Text></Space>
        </div>
        {role === '科室管理员' && <Alert type="info" showIcon message="科室管理员的数据自动限定为本科室；审批类操作默认不开放。" style={{ marginBottom: 16 }} />}
        <div className="permission-config-layout">
          <aside className="permission-module-nav">
            <div className="permission-module-nav-title">功能模块</div>
            {permissionTree.map((item) => {
              const keys = flattenKeys(item.children || [item]);
              const selected = keys.filter((key) => checked.includes(key)).length;
              return (
                <button
                  type="button"
                  key={item.key}
                  className={`permission-module-item${String(item.key) === activeModule ? ' is-active' : ''}`}
                  onClick={() => setActiveModule(String(item.key))}
                >
                  <span>{String(item.title)}</span>
                  <span className="permission-module-count">{selected}/{keys.length}</span>
                </button>
              );
            })}
          </aside>
          <section className="permission-detail-panel">
            <div className="permission-detail-header">
              <Space>
                <FolderOpenOutlined className="permission-folder-icon" />
                <Text strong>{String(currentModule.title)}</Text>
                <Text type="secondary">{currentCheckedCount}/{currentKeys.length} 项</Text>
              </Space>
              <Checkbox checked={moduleFullyChecked} indeterminate={modulePartlyChecked} onChange={(event) => checkModule(event.target.checked)}>
                全选本模块
              </Checkbox>
            </div>
            <Tree
              checkable
              blockNode
              defaultExpandAll
              treeData={currentNodes}
              checkedKeys={checked}
              onCheck={(keys) => checkCurrentTree(keys as React.Key[] | { checked: React.Key[] })}
              className="permission-tree"
            />
          </section>
        </div>
      </Card>
    </div>
  );
};

export default FunctionPermission;
