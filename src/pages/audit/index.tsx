import { useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Radio,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import PageHeader from '../../components/PageHeader';
import './audit.css';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

type AuditSection = 'economic' | 'project' | 'behavior' | 'logs';

const departments = ['全部科室', '0301 心内科', '0302 影像科', '0303 药剂科', '0304 医务科'];
const economicRows = [
  { key: '1', id: '0301-0007', name: '心血管疾病智能随访助手', version: 'V2.1', dept: '0301 心内科', budget: 180, tokens: 3284000, cost: 5.91, ratio: 30456.85, updated: '2026-07-28 09:42:16' },
  { key: '2', id: '0302-0012', name: '胸部CT影像智能分析平台', version: 'V3.0', dept: '0302 影像科', budget: 320, tokens: 8926000, cost: 16.07, ratio: 19912.88, updated: '2026-07-28 09:39:05' },
  { key: '3', id: '0303-0004', name: '合理用药智能审核助手', version: 'V1.8', dept: '0303 药剂科', budget: 95, tokens: 2145000, cost: 3.86, ratio: 24611.40, updated: '2026-07-28 09:35:32' },
  { key: '4', id: '0304-0009', name: '病案首页智能质控智能体', version: 'V2.4', dept: '0304 医务科', budget: 150, tokens: 4762000, cost: 8.57, ratio: 17502.92, updated: '2026-07-28 09:31:48' },
];

type ProjectStatus = '待申请' | '草稿' | '待审计' | '审计中' | '撤销修改' | '审计通过' | '审计不通过';
const statusColor: Record<ProjectStatus, string> = {
  待申请: 'default', 草稿: 'orange', 待审计: 'blue', 审计中: 'processing', 撤销修改: 'gold', 审计通过: 'success', 审计不通过: 'error',
};
const initialProjects = [
  { key: 'p1', name: 'AI 辅助心衰患者全程管理平台', dept: '心内科', track: '临床诊疗', owner: '周明', contact: '陈晓', phone: '138****1208', completion: 92, indicator: 88, fund: 76, status: '待审计' as ProjectStatus, time: '2026-07-26 14:20:16' },
  { key: 'p2', name: '多模态医学影像智能会诊平台', dept: '影像科', track: '智慧医技', owner: '王越', contact: '林青', phone: '139****6721', completion: 78, indicator: 82, fund: 68, status: '审计中' as ProjectStatus, time: '2026-07-25 10:12:42' },
  { key: 'p3', name: '处方前置审核与用药风险预警', dept: '药剂科', track: '合理用药', owner: '赵宁', contact: '吴凡', phone: '136****3882', completion: 100, indicator: 96, fund: 94, status: '审计通过' as ProjectStatus, time: '2026-07-23 16:45:09' },
  { key: 'p4', name: '门诊病历智能生成与质量控制', dept: '医务科', track: '医院管理', owner: '李嘉', contact: '高原', phone: '137****9016', completion: 65, indicator: 58, fund: 71, status: '草稿' as ProjectStatus, time: '2026-07-22 09:18:33' },
  { key: 'p5', name: '急诊智能预检分诊系统', dept: '急诊科', track: '临床诊疗', owner: '郑涛', contact: '孙悦', phone: '135****0432', completion: 0, indicator: 0, fund: 0, status: '待申请' as ProjectStatus, time: '2026-07-20 11:30:08' },
  { key: 'p6', name: '病理切片辅助诊断系统', dept: '病理科', track: '智慧医技', owner: '何伟', contact: '许静', phone: '133****2140', completion: 72, indicator: 61, fund: 89, status: '审计不通过' as ProjectStatus, time: '2026-07-18 15:40:22' },
];

const agentRows = [
  { key: 'a1', id: '0301-0007', name: '心血管疾病智能随访助手', version: 'V2.1', dept: '0301 心内科', sessions: 12842, last: '2026-07-28 09:41:56' },
  { key: 'a2', id: '0302-0012', name: '胸部CT影像智能分析平台', version: 'V3.0', dept: '0302 影像科', sessions: 9261, last: '2026-07-28 09:38:20' },
  { key: 'a3', id: '0303-0004', name: '合理用药智能审核助手', version: 'V1.8', dept: '0303 药剂科', sessions: 7640, last: '2026-07-28 09:32:15' },
  { key: 'a4', id: '0304-0009', name: '病案首页智能质控智能体', version: 'V2.4', dept: '0304 医务科', sessions: 4388, last: '2026-07-28 09:20:48' },
];

const sessions = [
  { key: 's1', title: '出院后血压管理建议', input: '患者张**，手机号 138****0521，出院后血压持续偏高，应该如何调整随访计划？', output: '建议先核对近七日晨起与睡前血压记录，并结合用药依从性进行分层随访…', duration: 108, start: '2026-07-28 09:40:08', end: '2026-07-28 09:41:56' },
  { key: 's2', title: '心衰患者饮食指导', input: '请为一位 NYHA II 级患者生成低盐饮食和每日体重监测建议。', output: '每日食盐摄入建议控制在 5 克以内，固定时间测量体重并记录水肿情况…', duration: 76, start: '2026-07-28 09:10:12', end: '2026-07-28 09:11:28' },
  { key: 's3', title: '复诊指标提醒', input: '这位患者下次复诊需要提前准备哪些检查结果？', output: '建议携带近期血压心率记录、肾功能、电解质和 NT-proBNP 检查结果…', duration: 53, start: '2026-07-27 16:22:41', end: '2026-07-27 16:23:34' },
];

const logRows = [
  { key: 'l1', user: '张明华', role: '信息科管理员', org: '信息中心', module: '审计中心', type: '导出', desc: '用户批量导出经济审计列表中选中的 4 条智能体记录', result: '成功', ip: '10.24.8.16', time: '2026-07-28 09:45:12' },
  { key: 'l2', user: '周明', role: '科室管理员', org: '心内科', module: '立项申报管理中心', type: '审计', desc: '用户提交“AI 辅助心衰患者全程管理平台”项目审计申请', result: '成功', ip: '10.24.31.88', time: '2026-07-28 09:31:26' },
  { key: 'l3', user: '王越', role: '科室管理员', org: '影像科', module: '智能体接入中心', type: '上传', desc: '用户上传胸部 CT 影像智能分析平台 V3.0 备案材料', result: '失败：仅支持 PDF 类型文件', ip: '10.24.42.19', time: '2026-07-28 09:18:43' },
  { key: 'l4', user: '李嘉', role: '医院领导', org: '医务科', module: '统一运行监控中心', type: '查看', desc: '用户查看 2026 年 7 月智能体运行成本监控报告', result: '成功', ip: '10.24.5.107', time: '2026-07-28 08:55:07' },
  { key: 'l5', user: '钱文博', role: '信息科管理员', org: '信息中心', module: '用户中心', type: '停用', desc: '用户停用离岗人员账号 sunyue，并回收关联角色权限', result: '成功', ip: '10.24.8.22', time: '2026-07-27 17:40:55' },
];

const Header = ({ title, description, extra }: { title: string; description: string; extra?: React.ReactNode }) => (
  <PageHeader title={title} subTitle={description} extra={extra} />
);

const Toolbar = ({ children }: { children: React.ReactNode }) => <Card className="audit-filter-card" bordered={false}>{children}</Card>;
const truncate = (value: string) => <Tooltip title={value}><span className="audit-ellipsis">{value}</span></Tooltip>;
const exportMessage = (message: ReturnType<typeof App.useApp>['message'], count: number) => message.success(`已生成 Excel 文件，共导出 ${count} 条记录`);

function EconomicAudit() {
  const { message } = App.useApp();
  const [dept, setDept] = useState('全部科室');
  const [selected, setSelected] = useState<React.Key[]>([]);
  const [refreshed, setRefreshed] = useState('09:42:16');
  const data = economicRows.filter((r) => dept === '全部科室' || r.dept === dept);
  const columns: ColumnsType<(typeof economicRows)[number]> = [
    { title: '智能体编号', dataIndex: 'id', width: 120, fixed: 'left' },
    { title: '智能体名称', dataIndex: 'name', width: 190, ellipsis: true },
    { title: '版本', dataIndex: 'version', width: 80 },
    { title: '所属科室', dataIndex: 'dept', width: 140 },
    { title: '投资预算金额', dataIndex: 'budget', width: 145, sorter: (a, b) => a.budget - b.budget, render: (v) => `${v.toFixed(2)} 万元` },
    { title: 'Token 消耗量', dataIndex: 'tokens', width: 145, sorter: (a, b) => a.tokens - b.tokens, render: (v) => v.toLocaleString() },
    { title: 'Token 使用金额', dataIndex: 'cost', width: 150, sorter: (a, b) => a.cost - b.cost, render: (v) => `¥ ${v.toFixed(2)}` },
    { title: '投入产出比', dataIndex: 'ratio', width: 130, sorter: (a, b) => a.ratio - b.ratio, render: (v) => <Text strong>{v.toLocaleString()}%</Text> },
    { title: '最后更新时间', dataIndex: 'updated', width: 175 },
  ];
  return <div>
    <Header title="经济审计" description="汇总智能体投资预算与 Token 实际消耗，辅助识别投入产出效率。"
      extra={<><Text type="secondary">数据更新于 {refreshed}</Text><Button icon={<ReloadOutlined />} onClick={() => { setRefreshed(new Date().toLocaleTimeString('zh-CN', { hour12: false })); message.success('数据已刷新'); }}>刷新</Button><Button type="primary" icon={<DownloadOutlined />} disabled={!selected.length} onClick={() => exportMessage(message, selected.length)}>批量导出</Button></>} />
    <div className="audit-stat-grid">
      <Card><Statistic title="纳入审计智能体" value={48} suffix="个" /></Card>
      <Card><Statistic title="总投资预算" value={2780} suffix="万元" /></Card>
      <Card><Statistic title="本月 Token 使用金额" value={126.84} prefix="¥" /></Card>
      <Card><Statistic title="平均投入产出比" value={21927.46} suffix="%" precision={2} /></Card>
    </div>
    <Toolbar><Space wrap><Text strong>所属科室</Text><Select value={dept} onChange={setDept} options={departments.map((x) => ({ label: x, value: x }))} style={{ width: 190 }} /><Text type="secondary">点击表头可按金额、用量或投入产出比排序</Text></Space></Toolbar>
    <Card bordered={false} className="audit-table-card"><Table rowSelection={{ selectedRowKeys: selected, onChange: setSelected }} columns={columns} dataSource={data} scroll={{ x: 1200 }} pagination={{ pageSize: 8, showTotal: (n) => `共 ${n} 条` }} /></Card>
  </div>;
}

const MetricCell = ({ value, empty }: { value: number; empty?: boolean }) => empty ? <Text type="secondary">—</Text> : <div className="metric-cell"><Progress percent={value} size="small" status={value < 70 ? 'exception' : 'normal'} /><Text type="secondary">{value < 100 ? '尚有部分建设内容待完成' : '已按计划全部完成'}</Text></div>;

function ProjectFormView({ project, onBack, onSubmit }: { project: typeof initialProjects[number]; onBack: () => void; onSubmit: () => void }) {
  const { message } = App.useApp();
  return <div>
    <Header title="项目审计信息填报" description="上传证明材料并核对项目建设、考核指标与资金使用情况。" extra={<Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回列表</Button>} />
    <Form layout="vertical" initialValues={{ completion: project.completion || 80, indicator: project.indicator || 85, used: 118, fund: project.fund || 74, completionNote: '核心功能已经上线试运行，患者端随访提醒模块正在进行最终联调。', fundDetail: '软硬件采购 82 万元；实施服务 26 万元；模型训练与测试 10 万元。' }}>
      <Card title="证明材料" className="audit-section-card"><div className="upload-grid">{['项目建设内容证明材料', '考核指标证明材料', '资金使用证明材料', '其他证明材料'].map((label) => <Form.Item key={label} label={label}><Upload beforeUpload={(file) => { if (file.type !== 'application/pdf') { message.error('上传失败，仅支持 PDF 类型文件'); return Upload.LIST_IGNORE; } if (file.size > 30 * 1024 * 1024) { message.error('上传失败，单文件超过最大限制 30M'); return Upload.LIST_IGNORE; } message.success('上传成功'); return false; }}><Button icon={<UploadOutlined />}>上传 PDF</Button></Upload></Form.Item>)}</div><Text type="secondary">仅支持 PDF，可上传多个文件，单文件不超过 30M。</Text></Card>
      <Card title="项目基本信息" className="audit-section-card"><Descriptions column={3} items={[
        { key: '1', label: '项目名称', children: project.name }, { key: '2', label: '申报科室', children: project.dept }, { key: '3', label: '申报赛道', children: project.track },
        { key: '4', label: '项目负责人', children: project.owner }, { key: '5', label: '项目联系人', children: project.contact }, { key: '6', label: '联系方式', children: project.phone },
      ]} /></Card>
      <Card title="项目建设内容完成情况" className="audit-section-card"><Form.Item label="项目计划完成形式"><Input value="建设院内一体化管理平台并完成临床科室试运行" readOnly /></Form.Item><Form.Item name="completion" label="完成度" rules={[{ required: true }]}><InputNumber min={0} max={100} addonAfter="%" style={{ width: 220 }} /></Form.Item><Form.Item name="completionNote" label="其他说明"><Input.TextArea rows={3} maxLength={500} showCount /></Form.Item></Card>
      <Card title="考核指标达成情况" className="audit-section-card"><Table pagination={false} dataSource={[{ key: 1, name: '随访任务按时完成率', target: '≥ 90%' }, { key: 2, name: '临床使用满意度', target: '≥ 85 分' }]} columns={[{ title: '指标名称', dataIndex: 'name' }, { title: '目标值', dataIndex: 'target' }, { title: '实际完成值', render: () => <Input defaultValue="88%" /> }, { title: '达成率', render: () => <InputNumber defaultValue={92} min={0} max={100} addonAfter="%" /> }]} /></Card>
      <Card title="资金使用情况" className="audit-section-card"><div className="form-grid"><Form.Item label="投资总预算"><Input value="180 万元" readOnly /></Form.Item><Form.Item name="used" label="已使用金额"><InputNumber min={0} addonAfter="万元" style={{ width: '100%' }} /></Form.Item><Form.Item name="fund" label="资金使用率"><InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} /></Form.Item></div><Form.Item name="fundDetail" label="资金使用明细"><Input.TextArea rows={3} /></Form.Item></Card>
      <div className="sticky-actions"><Button onClick={() => message.success('项目审计信息填报表单填写记录已暂存至草稿状态列表页')}>暂存</Button><Button type="primary" onClick={() => { message.success('提交成功'); onSubmit(); }}>提交审计</Button></div>
    </Form>
  </div>;
}

function ProjectDetail({ project, auditMode, onBack, onFinish }: { project: typeof initialProjects[number]; auditMode?: boolean; onBack: () => void; onFinish?: (pass: boolean) => void }) {
  const [conclusion, setConclusion] = useState<'pass' | 'fail'>('pass');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState(false);
  const { modal } = App.useApp();
  const submit = () => modal.confirm({ title: `确认是否审计${conclusion === 'pass' ? '通过' : '不通过'}？`, content: '提交后项目将进入对应审计结果列表。', okText: '是，确认提交', cancelText: '否', onOk: () => onFinish?.(conclusion === 'pass') });
  return <div>
    <Header title={auditMode ? '项目信息审计' : '项目审计信息详情'} description={project.name} extra={<Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回</Button>} />
    <Card title="证明材料" className="audit-section-card"><Space wrap>{['项目建设内容说明.pdf', '考核指标证明材料.pdf', '资金使用明细.pdf'].map((x) => <Button key={x} icon={<FilePdfOutlined />} onClick={() => setPreview(true)}>{x}</Button>)}</Space></Card>
    <Card title="项目基本信息" className="audit-section-card"><Descriptions column={3} bordered items={[
      { key: 1, label: '项目名称', children: project.name }, { key: 2, label: '申报科室', children: project.dept }, { key: 3, label: '申报赛道', children: project.track }, { key: 4, label: '项目负责人', children: project.owner }, { key: 5, label: '项目联系人', children: project.contact }, { key: 6, label: '联系方式', children: project.phone },
    ]} /></Card>
    <div className="audit-stat-grid audit-stat-grid-three"><Card title="建设内容完成情况"><Progress type="dashboard" percent={project.completion || 80} /><Paragraph>核心功能已上线试运行，患者端随访提醒模块正在进行最终联调。</Paragraph></Card><Card title="考核指标达成情况"><Progress type="dashboard" percent={project.indicator || 85} /><Paragraph>两项核心指标中，一项已达标，一项接近目标值。</Paragraph></Card><Card title="资金使用情况"><Progress type="dashboard" percent={project.fund || 74} /><Paragraph>资金用于软硬件采购、实施服务、模型训练及测试。</Paragraph></Card></div>
    {auditMode && <Card title="审计结论" className="audit-section-card"><Radio.Group value={conclusion} onChange={(e) => setConclusion(e.target.value)}><Radio.Button value="pass">通过</Radio.Button><Radio.Button value="fail">不通过</Radio.Button></Radio.Group><div className="audit-note"><Input.TextArea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} showCount rows={5} placeholder={conclusion === 'pass' ? '请填写项目达到审计要求的具体说明' : '请填写未通过原因及整改建议'} /></div><Button danger={conclusion === 'fail'} type="primary" disabled={!note.trim()} onClick={submit}>提交审计结论</Button></Card>}
    <Modal open={preview} onCancel={() => setPreview(false)} footer={<Button onClick={() => setPreview(false)}>关闭</Button>} title="证明材料预览" width={760}><div className="pdf-preview"><FilePdfOutlined /><Title level={4}>PDF 在线预览</Title><Text type="secondary">演示环境已对接文件预览与下载操作。</Text></div></Modal>
  </div>;
}

function ProjectAudit() {
  const { message, modal } = App.useApp();
  const [projects, setProjects] = useState(initialProjects);
  const [status, setStatus] = useState<ProjectStatus | '全部'>('全部');
  const [screen, setScreen] = useState<'list' | 'form' | 'detail' | 'audit'>('list');
  const [current, setCurrent] = useState(initialProjects[0]);
  const filtered = projects.filter((p) => status === '全部' || p.status === status);
  if (screen === 'form') return <ProjectFormView project={current} onBack={() => setScreen('list')} onSubmit={() => { setProjects((rows) => rows.map((r) => r.key === current.key ? { ...r, status: '待审计' } : r)); setStatus('待审计'); setScreen('list'); }} />;
  if (screen === 'detail' || screen === 'audit') return <ProjectDetail project={current} auditMode={screen === 'audit'} onBack={() => setScreen('list')} onFinish={(pass) => { setProjects((rows) => rows.map((r) => r.key === current.key ? { ...r, status: pass ? '审计通过' : '审计不通过' } : r)); message.success(`审计${pass ? '通过' : '不通过'}，记录已归档`); setStatus(pass ? '审计通过' : '审计不通过'); setScreen('list'); }} />;
  const actions = (record: typeof initialProjects[number]) => {
    const go = (target: 'form' | 'detail' | 'audit') => { setCurrent(record); setScreen(target); };
    if (record.status === '待申请') return <Button type="link" onClick={() => go('form')}>项目审计信息填报</Button>;
    if (record.status === '草稿') return <Space size={0}><Button type="link" onClick={() => go('form')}>编辑</Button><Button type="link" danger onClick={() => modal.confirm({ title: '确认是否删除？', onOk: () => { setProjects((r) => r.filter((x) => x.key !== record.key)); message.success('删除成功'); } })}>删除</Button></Space>;
    if (['待审计', '审计中'].includes(record.status)) return <Space size={0}><Button type="link" onClick={() => go('detail')}>查看详情</Button><Button type="link" onClick={() => go('audit')}>审计</Button><Button type="link" onClick={() => { setProjects((rows) => rows.map((r) => r.key === record.key ? { ...r, status: '撤销修改' } : r)); message.success('已撤销至修改列表'); }}>撤销</Button></Space>;
    if (record.status === '撤销修改') return <Space size={0}><Button type="link" onClick={() => go('detail')}>查看详情</Button><Button type="link" onClick={() => go('form')}>编辑</Button></Space>;
    return <Button type="link" onClick={() => go('detail')}>查看详情</Button>;
  };
  const columns: ColumnsType<(typeof initialProjects)[number]> = [
    { title: '项目名称', dataIndex: 'name', width: 220, fixed: 'left', ellipsis: true },
    { title: '申报科室', dataIndex: 'dept', width: 100 }, { title: '申报赛道', dataIndex: 'track', width: 110 }, { title: '项目负责人', dataIndex: 'owner', width: 100 }, { title: '项目联系人', dataIndex: 'contact', width: 100 }, { title: '联系方式', dataIndex: 'phone', width: 125 },
    { title: '建设内容完成情况', dataIndex: 'completion', width: 190, render: (v, r) => <MetricCell value={v} empty={r.status === '待申请'} /> },
    { title: '考核指标达成情况', dataIndex: 'indicator', width: 190, render: (v, r) => <MetricCell value={v} empty={r.status === '待申请'} /> },
    { title: '资金使用情况', dataIndex: 'fund', width: 190, render: (v, r) => <MetricCell value={v} empty={r.status === '待申请'} /> },
    { title: '审计状态', dataIndex: 'status', width: 105, render: (v: ProjectStatus) => <Tag color={statusColor[v]}>{v}</Tag> },
    { title: '更新时间', dataIndex: 'time', width: 175 },
    { title: '操作', fixed: 'right', width: 230, render: (_, r) => actions(r) },
  ];
  return <div><Header title="项目审计" description="覆盖项目填报、提交、两级审计、撤销修改与结果归档全流程。" extra={<Button icon={<DownloadOutlined />} onClick={() => exportMessage(message, filtered.length)}>批量导出</Button>} />
    <Card bordered={false} className="audit-status-card"><Tabs activeKey={status} onChange={(x) => setStatus(x as typeof status)} items={(['全部', '待申请', '草稿', '待审计', '审计中', '撤销修改', '审计通过', '审计不通过'] as const).map((x) => ({ key: x, label: <span>{x}<span className="tab-count">{x === '全部' ? projects.length : projects.filter((p) => p.status === x).length}</span></span> }))} /></Card>
    <Card bordered={false} className="audit-table-card"><Table columns={columns} dataSource={filtered} scroll={{ x: 1850 }} pagination={{ pageSize: 8, showTotal: (n) => `共 ${n} 条` }} /></Card></div>;
}

function BehaviorAudit() {
  const { message } = App.useApp();
  const [agent, setAgent] = useState<(typeof agentRows)[number] | null>(null);
  const [session, setSession] = useState<(typeof sessions)[number] | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<React.Key[]>([]);
  const agents = agentRows.filter((x) => `${x.id}${x.name}`.toLowerCase().includes(query.toLowerCase()));
  if (agent) return <div><Header title="智能体会话记录" description={`${agent.id} · ${agent.name}`} extra={<><Button icon={<ReloadOutlined />} onClick={() => message.success('会话数据已刷新')}>刷新</Button><Button icon={<ArrowLeftOutlined />} onClick={() => setAgent(null)}>返回智能体列表</Button></>} />
    <Toolbar><Space wrap><Input prefix={<SearchOutlined />} placeholder="搜索会话标题或摘要" style={{ width: 280 }} /><Select defaultValue="startDesc" options={[{ label: '开始时间：由近到远', value: 'startDesc' }, { label: '开始时间：由远到近', value: 'startAsc' }, { label: '会话时长：由高到低', value: 'durationDesc' }]} style={{ width: 200 }} /><RangePicker showTime /></Space></Toolbar>
    <Card bordered={false} className="audit-table-card"><Table dataSource={sessions} columns={[
      { title: '会话标题', dataIndex: 'title', width: 190 }, { title: '首轮输入摘要', dataIndex: 'input', ellipsis: true, render: truncate }, { title: '末轮输出摘要', dataIndex: 'output', ellipsis: true, render: truncate }, { title: '会话时长', dataIndex: 'duration', width: 110, sorter: (a, b) => a.duration - b.duration, render: (v) => `${Math.floor(v / 60)} 分 ${v % 60} 秒` }, { title: '会话开始时间', dataIndex: 'start', width: 175 }, { title: '会话结束时间', dataIndex: 'end', width: 175 }, { title: '操作', width: 90, render: (_, r) => <Button type="link" onClick={() => setSession(r)}>查看详情</Button> },
    ]} scroll={{ x: 1250 }} /></Card>
    <Drawer title={session?.title} open={!!session} onClose={() => setSession(null)} width={620}><Text type="secondary">会话全过程 · 敏感信息已脱敏</Text><Timeline className="session-timeline" items={session ? [{ color: 'blue', children: <><Text strong>用户 · {session.start}</Text><Paragraph>{session.input}</Paragraph></> }, { color: 'green', children: <><Text strong>智能体 · {session.end}</Text><Paragraph>{session.output}</Paragraph><div className="safe-note"><CheckCircleOutlined /> 内容安全检测通过 · 未发现敏感信息外泄</div></> }] : []} /></Drawer>
  </div>;
  return <div><Header title="智能体行为审计" description="按智能体查看会话规模、最近调用时间并下钻追溯完整交互。" extra={<><Button icon={<ReloadOutlined />} onClick={() => message.success('数据已刷新')}>刷新</Button><Button type="primary" icon={<DownloadOutlined />} disabled={!selected.length} onClick={() => exportMessage(message, selected.length)}>批量导出</Button></>} />
    <div className="audit-stat-grid"><Card><Statistic title="纳入审计智能体" value={48} /></Card><Card><Statistic title="今日会话数" value={2386} /></Card><Card><Statistic title="近 7 日会话数" value={15920} /></Card><Card><Statistic title="今日敏感信息脱敏" value={127} /></Card></div>
    <Toolbar><Space wrap><Input value={query} onChange={(e) => setQuery(e.target.value)} prefix={<SearchOutlined />} placeholder="搜索智能体编号或名称" allowClear style={{ width: 280 }} /><Select defaultValue="全部科室" options={departments.map((x) => ({ label: x, value: x }))} style={{ width: 190 }} /><Select defaultValue="sessionDesc" options={[{ label: '会话数：由高到低', value: 'sessionDesc' }, { label: '会话数：由低到高', value: 'sessionAsc' }]} style={{ width: 185 }} /><RangePicker placeholder={['最近调用开始', '最近调用结束']} /></Space></Toolbar>
    <Card bordered={false} className="audit-table-card"><Table rowSelection={{ selectedRowKeys: selected, onChange: setSelected }} dataSource={agents} columns={[
      { title: '智能体编号', dataIndex: 'id', render: (v, r) => <Button type="link" onClick={() => setAgent(r)}>{v}</Button> }, { title: '智能体名称', dataIndex: 'name' }, { title: '版本', dataIndex: 'version', width: 90 }, { title: '所属科室', dataIndex: 'dept' }, { title: '会话数', dataIndex: 'sessions', sorter: (a, b) => a.sessions - b.sessions, render: (v) => v.toLocaleString() }, { title: '最近调用时间', dataIndex: 'last', sorter: (a, b) => a.last.localeCompare(b.last) }, { title: '操作', render: (_, r) => <Button type="link" onClick={() => setAgent(r)}>查看所有会话记录</Button> },
    ]} /></Card></div>;
}

function OperationLogs() {
  const { message } = App.useApp();
  const [filters, setFilters] = useState({ org: '全部组织', module: '全部模块', type: '全部类型', result: '全部结果' });
  const [selected, setSelected] = useState<React.Key[]>([]);
  const [detail, setDetail] = useState<(typeof logRows)[number] | null>(null);
  const filtered = useMemo(() => logRows.filter((x) => (filters.org === '全部组织' || x.org === filters.org) && (filters.module === '全部模块' || x.module === filters.module) && (filters.type === '全部类型' || x.type === filters.type) && (filters.result === '全部结果' || x.result.startsWith(filters.result))), [filters]);
  const choose = (key: keyof typeof filters, value: string) => setFilters((p) => ({ ...p, [key]: value }));
  return <div><Header title="操作日志" description="记录平台关键操作、执行结果和登录 IP，满足全过程留痕与责任追溯。" extra={<><Button icon={<ReloadOutlined />} onClick={() => message.success('日志已刷新')}>刷新</Button><Button type="primary" icon={<DownloadOutlined />} disabled={!selected.length} onClick={() => exportMessage(message, selected.length)}>批量导出</Button></>} />
    <Toolbar><div className="filter-grid"><Select value={filters.org} onChange={(v) => choose('org', v)} options={['全部组织', '信息中心', '心内科', '影像科', '医务科'].map((x) => ({ label: x, value: x }))} /><Select value={filters.module} onChange={(v) => choose('module', v)} options={['全部模块', ...new Set(logRows.map((x) => x.module))].map((x) => ({ label: x, value: x }))} /><Select value={filters.type} onChange={(v) => choose('type', v)} options={['全部类型', '新建', '编辑', '删除', '查看', '上传', '导出', '审计', '撤销', '停用'].map((x) => ({ label: x, value: x }))} /><Select value={filters.result} onChange={(v) => choose('result', v)} options={['全部结果', '成功', '失败'].map((x) => ({ label: x, value: x }))} /><RangePicker showTime /></div></Toolbar>
    <Card bordered={false} className="audit-table-card"><Table rowSelection={{ selectedRowKeys: selected, onChange: setSelected }} dataSource={filtered} columns={[
      { title: '用户名称', dataIndex: 'user', width: 100 }, { title: '用户角色', dataIndex: 'role', width: 125 }, { title: '所属组织', dataIndex: 'org', width: 100 }, { title: '操作模块', dataIndex: 'module', width: 165, ellipsis: true }, { title: '操作类型', dataIndex: 'type', width: 90, render: (v) => <Tag color="blue">{v}</Tag> }, { title: '操作描述', dataIndex: 'desc', width: 250, ellipsis: true, render: truncate }, { title: '操作结果', dataIndex: 'result', width: 190, render: (v: string) => <Tag color={v === '成功' ? 'success' : 'error'}>{v}</Tag> }, { title: '登录 IP 地址', dataIndex: 'ip', width: 130 }, { title: '操作时间', dataIndex: 'time', width: 175, sorter: (a, b) => a.time.localeCompare(b.time) }, { title: '操作', fixed: 'right', width: 90, render: (_, r) => <Button type="link" icon={<EyeOutlined />} onClick={() => setDetail(r)}>详情</Button> },
    ]} scroll={{ x: 1450 }} pagination={{ pageSize: 8, showTotal: (n) => `共 ${n} 条` }} /></Card>
    <Drawer title="操作日志详情" open={!!detail} onClose={() => setDetail(null)} width={620} extra={<Button onClick={() => setDetail(null)}>返回</Button>}>{detail && <><div className={`log-result ${detail.result === '成功' ? 'success' : 'error'}`}>{detail.result === '成功' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}<div><Text strong>{detail.result}</Text><Text type="secondary">系统已完整记录本次操作上下文</Text></div></div><Descriptions column={1} bordered items={Object.entries({ 用户名称: detail.user, 用户角色: detail.role, 所属组织: detail.org, 操作模块: detail.module, 操作类型: detail.type, 操作描述: detail.desc, 操作结果: detail.result, '登录 IP 地址': detail.ip, 操作时间: detail.time }).map(([label, children]) => ({ key: label, label, children }))} /></>}</Drawer>
  </div>;
}

export default function AuditCenter() {
  const location = useLocation();
  const section = (location.pathname.split('/')[3] || 'economic') as AuditSection;
  const current = ['economic', 'project', 'behavior', 'logs'].includes(section) ? section : 'economic';
  const content = current === 'economic' ? <EconomicAudit /> : current === 'project' ? <ProjectAudit /> : current === 'behavior' ? <BehaviorAudit /> : <OperationLogs />;
  return <App><div className="audit-page">{content}</div></App>;
}
