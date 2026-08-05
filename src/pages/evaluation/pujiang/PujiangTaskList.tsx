import { useMemo, useState, type ReactNode } from 'react';
import { Button, Card, Dropdown, Input, Modal, Select, Space, Table, Tabs, Tag, Tooltip, Typography, message } from 'antd';
import { DeleteOutlined, EditOutlined, EyeOutlined, MoreOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { PUJIANG_PLATFORM, initialPujiangTasks, type PujiangStatus, type PujiangTask } from './data';

const { Text, Link } = Typography;
type TabKey = 'all' | PujiangStatus;

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部任务' },
  { key: '草稿', label: '草稿' },
  { key: '评测中', label: '评测中' },
  { key: '评测通过', label: '评测通过' },
  { key: '退回修改', label: '退回修改' },
];

const dimensionsText = '临床任务规划与推理 / 医疗工具调用与执行 / 医疗场景感知与交互 / 记忆与上下文保持 / 医疗多智能体协作';

interface Props { moduleSwitcher: ReactNode; }

const PujiangTaskList = ({ moduleSwitcher }: Props) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(initialPujiangTasks);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<PujiangStatus>();

  const counts = useMemo(() => Object.fromEntries(tabs.map((tab) => [tab.key, tab.key === 'all' ? tasks.length : tasks.filter((task) => task.status === tab.key).length])), [tasks]);
  const visibleTasks = useMemo(() => tasks.filter((task) => {
    if (activeTab !== 'all' && task.status !== activeTab) return false;
    if (status && task.status !== status) return false;
    const value = keyword.trim().toLowerCase();
    return !value || task.agentName.toLowerCase().includes(value) || task.agentCode.toLowerCase().includes(value);
  }), [activeTab, keyword, status, tasks]);

  const remove = (task: PujiangTask) => Modal.confirm({
    title: '确认删除评测任务？',
    content: `删除后「${task.agentName}」的草稿无法恢复。`,
    okText: '删除', okType: 'danger', cancelText: '取消',
    onOk: () => { setTasks((previous) => previous.filter((item) => item.id !== task.id)); message.success('已删除'); },
  });

  const columns: ColumnsType<PujiangTask> = [
    { title: '序号', width: 64, render: (_, __, index) => index + 1 },
    { title: '智能体编号', dataIndex: 'agentCode', width: 120 },
    { title: '智能体名称', dataIndex: 'agentName', width: 180, render: (value, record) => <Tooltip title={value}><Link onClick={() => navigate(`/app/agent-center/detail/${record.agentId}`)}>{value.length > 10 ? `${value.slice(0, 10)}…` : value}</Link></Tooltip> },
    { title: '智能体版本', dataIndex: 'version', width: 100, render: (value) => <Tag>{value}</Tag> },
    { title: '评测平台', width: 180, render: () => PUJIANG_PLATFORM },
    { title: '评测维度', width: 240, render: () => <Tooltip title={dimensionsText}><Text ellipsis style={{ width: 220 }}>{dimensionsText}</Text></Tooltip> },
  ];
  if (activeTab === 'all') columns.push({ title: '评测状态', dataIndex: 'status', width: 110, render: (value: PujiangStatus) => <Tag color={value === '评测通过' ? 'success' : value === '退回修改' ? 'error' : value === '评测中' ? 'processing' : 'default'}>{value}</Tag> });
  if (activeTab === '草稿') columns.push({ title: '最后编辑时间', dataIndex: 'lastEditTime', width: 170 });
  if (activeTab === '评测中') columns.push({ title: '提交评测时间', dataIndex: 'submitTime', width: 170 });
  if (activeTab === '评测通过' || activeTab === '退回修改') columns.push(
    { title: '评测结果', width: 110, render: (_, record) => <Tag color={record.status === '评测通过' ? 'success' : 'error'}>{record.status}</Tag> },
    { title: '评测结果说明', dataIndex: 'resultDesc', width: 240, render: (value = '') => <Tooltip title={value}><span>{value.length > 30 ? `${value.slice(0, 30)}…` : value}</span></Tooltip> },
    { title: '评测完成时间', dataIndex: 'completeTime', width: 170 },
  );
  columns.push({ title: '操作', fixed: 'right', width: 150, render: (_, record) => <Space size={4}>
    <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/app/evaluation/tasks/pujiang/${record.id}`)}>查看详情</Button>
    {record.status === '草稿' && <Dropdown trigger={['click']} menu={{ items: [
      { key: 'edit', label: '编辑', icon: <EditOutlined />, onClick: () => navigate(`/app/evaluation/tasks/pujiang/create?taskId=${record.id}`) },
      { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true, onClick: () => remove(record) },
    ] }}><Button type="link" size="small" icon={<MoreOutlined />} style={{ padding: 0 }}>更多</Button></Dropdown>}
  </Space> });

  return <>
    <Card style={{ marginTop: 16 }}>
      {moduleSwitcher}
      <Tabs activeKey={activeTab} onChange={(key) => { setActiveTab(key as TabKey); setStatus(undefined); }} items={tabs.map((tab) => ({ key: tab.key, label: <Space size={4}><span>{tab.label}</span><Text type="secondary">({counts[tab.key]})</Text></Space> }))} />
      <Space wrap size={8}>
        <Input allowClear prefix={<SearchOutlined />} placeholder="搜索智能体名称 / 编号" value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: 280 }} />
        {activeTab === 'all' && <Select allowClear placeholder="评测状态" value={status} onChange={setStatus} style={{ width: 160 }} options={tabs.slice(1).map((tab) => ({ label: tab.label, value: tab.key }))} />}
        <Button onClick={() => { setKeyword(''); setStatus(undefined); }}>重置</Button>
        <Text type="secondary">共 {visibleTasks.length} 条</Text>
      </Space>
    </Card>
    <div style={{ background: '#fff', borderRadius: 8, marginTop: 16, border: '1px solid #F0F0F0' }}>
      <Table rowKey="id" columns={columns} dataSource={visibleTasks} pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条` }} scroll={{ x: 1500 }} />
    </div>
  </>;
};

export default PujiangTaskList;
