import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
  SendOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { departmentOptions } from '../../mock/departments';
import { useAuth } from '../../hooks/useAuth';
import './projectApplication.css';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

type ProjectStatus = '草稿' | '待审核' | '审核中' | '撤销修改' | '立项不通过' | '立项通过';

interface ProjectRecord {
  id: string;
  name: string;
  department: string;
  superiorDepartment: string;
  track: string;
  leader: string;
  contact: string;
  phone: string;
  supports: string[];
  overview: string;
  painPoints: string;
  technologies: string[];
  models: string[];
  deliverables: string;
  indicators: string;
  totalBudget: number;
  fundingDetail: string;
  spendingDetail: string;
  status: ProjectStatus;
  applicant: string;
  updateTime: string;
  submitTime?: string;
  revokeTime?: string;
  finishTime?: string;
  reviewNote?: string;
  files: string[];
}

const STORAGE_KEY = 'project-application-demo-v1';
const now = () => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
const seedData: ProjectRecord[] = [
  { id: 'PA-2026-001', name: '超声检查智能预约与检前指导项目', department: '超声科', superiorDepartment: '数智发展处', track: '助医赛道', leader: '周明远', contact: '林佳', phone: '13800138001', supports: ['算力支持', '技术指导支持'], overview: '建设面向患者的超声检查智能预约与检前指导智能体，联动院内预约系统，提升检查准备质量与就诊效率。', painPoints: '预约规则复杂、患者准备不充分，重复咨询量高，现场改约影响检查效率。', technologies: ['自然语言处理', '知识图谱'], models: ['Qwen模型'], deliverables: '形成 1 个预约指导智能体、1 套专科知识库及院内预约接口。', indicators: '预约咨询人工工作量降低 40%，检查准备合格率提升至 95%。', totalBudget: 36, fundingDetail: '医院资助 20 万元；其它渠道资助 16 万元', spendingDetail: '软件购置 12 万元；系统集成 4 万元；研发设计 20 万元', status: '待审核', applicant: '钱文博', updateTime: '2026-07-25 14:30:00', submitTime: '2026-07-25 14:30:00', files: ['超声检查智能预约项目申报书.pdf'] },
  { id: 'PA-2026-002', name: '住院病历智能生成项目', department: '医务处', superiorDepartment: '医务处', track: '助医赛道', leader: '郑雅婷', contact: '陈晨', phone: '13912345678', supports: ['数据要素支持', '算力支持'], overview: '面向住院医生提供结构化病历辅助生成与质量校验。', painPoints: '病历书写耗时长，质量一致性有待提升。', technologies: ['自然语言处理', '大模型'], models: ['Deepseek模型'], deliverables: '1 个病历生成智能体与 2 个专科知识库。', indicators: '病历书写时间降低 30%。', totalBudget: 58, fundingDetail: '医院资助 58 万元', spendingDetail: '算力租赁 20 万元；研发设计 38 万元', status: '审核中', applicant: '郑雅婷', updateTime: '2026-07-24 11:20:00', submitTime: '2026-07-24 11:20:00', files: ['住院病历智能生成项目申报书.pdf', '数据安全评估说明.pdf'] },
  { id: 'PA-2026-003', name: '手术麻醉风险智能评估项目', department: '麻醉科', superiorDepartment: '临床研究中心', track: '促研赛道', leader: '刘晓燕', contact: '周一帆', phone: '13788990012', supports: ['资金支持', '数据要素支持'], overview: '基于多模态数据构建围术期麻醉风险预测模型。', painPoints: '风险评估依赖人工经验，跨系统信息整合难。', technologies: ['多模态', '机器学习'], models: ['LLaMa模型'], deliverables: '风险评估模型 1 套、临床决策支持智能体 1 个。', indicators: '高风险识别召回率不低于 90%。', totalBudget: 80, fundingDetail: '市卫健委资助 50 万元；医院资助 30 万元', spendingDetail: '硬件设备 30 万元；研发设计 50 万元', status: '立项通过', applicant: '刘晓燕', updateTime: '2026-07-18 16:10:00', submitTime: '2026-07-10 09:15:00', finishTime: '2026-07-18 16:10:00', reviewNote: '项目方案完整，临床价值明确，同意立项。', files: ['手术麻醉风险智能评估项目申报书.pdf'] },
  { id: 'PA-2026-004', name: '门诊智能导诊优化项目', department: '急诊科', superiorDepartment: '医务处', track: '便民赛道', leader: '黄海涛', contact: '王璐', phone: '13677665544', supports: ['项目推广'], overview: '优化门诊患者分诊与科室推荐。', painPoints: '患者对科室职责不清晰，错挂号率较高。', technologies: ['自然语言处理'], models: ['豆包模型'], deliverables: '门诊导诊智能体 1 个。', indicators: '错挂号率降低 20%。', totalBudget: 18, fundingDetail: '医院资助 18 万元', spendingDetail: '研发设计 18 万元', status: '草稿', applicant: 'admin', updateTime: '2026-07-27 10:05:00', files: [] },
  { id: 'PA-2026-005', name: '影像随访智能提醒项目', department: '影像科', superiorDepartment: '数智发展处', track: '辅政赛道', leader: '林佳', contact: '林佳', phone: '13566889900', supports: ['技术指导支持'], overview: '对影像报告中的随访建议进行结构化提取和提醒。', painPoints: '随访建议缺少统一闭环管理。', technologies: ['计算机视觉', '自然语言处理'], models: ['Qwen模型'], deliverables: '随访提醒智能体 1 个。', indicators: '重点患者随访触达率达到 95%。', totalBudget: 25, fundingDetail: '医院资助 25 万元', spendingDetail: '软件购置 10 万元；研发设计 15 万元', status: '撤销修改', applicant: '林佳', updateTime: '2026-07-23 15:30:00', revokeTime: '2026-07-23 15:30:00', files: ['影像随访智能提醒项目申报书.pdf'] },
  { id: 'PA-2026-006', name: '慢病健康教育数字人项目', department: '内分泌科', superiorDepartment: '科研处', track: '便民赛道', leader: '孙悦', contact: '赵敏', phone: '13344556677', supports: ['资金支持', '项目推广'], overview: '为慢病患者提供个性化健康教育。', painPoints: '健康教育内容同质化，患者依从性不足。', technologies: ['智能语音', '数字孪生'], models: ['Kimi模型'], deliverables: '健康教育数字人 1 个。', indicators: '患者健康知识知晓率提升 25%。', totalBudget: 42, fundingDetail: '其它渠道资助 42 万元', spendingDetail: '软硬件购置 28 万元；研发设计 14 万元', status: '立项不通过', applicant: '孙悦', updateTime: '2026-07-16 09:40:00', finishTime: '2026-07-16 09:40:00', reviewNote: '现阶段数据来源与运营方案不够清晰，建议完善后重新申报。', files: ['慢病健康教育数字人项目申报书.pdf'] },
];

const readRecords = (): ProjectRecord[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seedData;
  } catch {
    return seedData;
  }
};
const writeRecords = (rows: ProjectRecord[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
const getRecord = (id?: string) => readRecords().find((item) => item.id === id);
const saveRecord = (record: ProjectRecord) => {
  const rows = readRecords();
  const index = rows.findIndex((item) => item.id === record.id);
  if (index >= 0) rows[index] = record;
  else rows.unshift(record);
  writeRecords(rows);
};

const statusColor: Record<ProjectStatus, string> = {
  草稿: 'default', 待审核: 'processing', 审核中: 'cyan',
  撤销修改: 'orange', 立项不通过: 'error', 立项通过: 'success',
};
const statuses: Array<'全部立项' | ProjectStatus> = ['全部立项', '草稿', '待审核', '审核中', '撤销修改', '立项不通过', '立项通过'];
const tracks = ['便民赛道', '助医赛道', '辅政赛道', '促研赛道', '其他'];
const supportOptions = ['资金支持', '算力支持', '数据要素支持', '项目推广', '技术指导支持', '其他'];
const technologyOptions = ['计算机视觉', '智能语音', '多模态', '边缘计算', '数字孪生', '自然语言处理', '知识图谱', '机器学习', '隐私计算', '高性能计算', '其他'];
const modelOptions = ['GPT模型', 'Claude模型', 'LLaMa模型', 'Gemini模型', 'Deepseek模型', 'Qwen模型', '豆包模型', 'Kimi模型', 'Grok模型', '其他'];

export default function ProjectApplication() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.roles.includes('信息科管理员') ?? false;
  const [records, setRecords] = useState(readRecords);
  const [keyword, setKeyword] = useState('');
  const [department, setDepartment] = useState('');
  const [track, setTrack] = useState('');
  const active = (searchParams.get('status') as ProjectStatus) || '全部立项';

  const scopedRecords = useMemo(() => records.filter((item) =>
    (isAdmin || item.applicant === currentUser?.name || item.applicant === 'admin') &&
    (active === '全部立项' || item.status === active) &&
    (!keyword || item.name.includes(keyword)) &&
    (!department || item.department === department) &&
    (!track || item.track === track)
  ), [records, isAdmin, currentUser?.name, active, keyword, department, track]);

  const updateStatus = (record: ProjectRecord, status: ProjectStatus) => {
    const next = records.map((item) => item.id === record.id
      ? { ...item, status, updateTime: now(), ...(status === '撤销修改' ? { revokeTime: now() } : {}) }
      : item);
    setRecords(next);
    writeRecords(next);
    message.success(status === '撤销修改' ? '已撤销，可在“撤销修改”中继续编辑' : '操作成功');
  };
  const remove = (record: ProjectRecord) => Modal.confirm({
    title: '确认是否删除？',
    content: `删除后将无法恢复“${record.name}”。`,
    okText: '是', cancelText: '否', okButtonProps: { danger: true },
    onOk: () => {
      const next = records.filter((item) => item.id !== record.id);
      setRecords(next); writeRecords(next); message.success('删除成功');
    },
  });

  const columns: ColumnsType<ProjectRecord> = [
    { title: '项目名称', dataIndex: 'name', width: 230, fixed: 'left', render: (value, row) => <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/app/project-application/detail/${row.id}`)}>{value}</Button> },
    { title: '申报科室', dataIndex: 'department', width: 110 },
    { title: '申报赛道', dataIndex: 'track', width: 100 },
    { title: '项目负责人', dataIndex: 'leader', width: 110 },
    { title: '项目联系人', dataIndex: 'contact', width: 110 },
    { title: '联系方式', dataIndex: 'phone', width: 125, render: (v: string) => `${v.slice(0, 3)}****${v.slice(7)}` },
    { title: '希望获取的支持', dataIndex: 'supports', width: 190, ellipsis: true, render: (v: string[]) => v.join('、') || '--' },
    ...(active === '立项不通过' || active === '立项通过' ? [{ title: '具体说明', dataIndex: 'reviewNote', width: 220, ellipsis: true }] : []),
    { title: active === '草稿' ? '最后编辑时间' : active === '撤销修改' ? '撤销时间' : active === '立项不通过' || active === '立项通过' ? '审核完成时间' : '提交审核时间', width: 175, render: (_, row) => active === '草稿' ? row.updateTime : active === '撤销修改' ? row.revokeTime : active === '立项不通过' || active === '立项通过' ? row.finishTime : row.submitTime || '--' },
    { title: '立项状态', dataIndex: 'status', width: 105, render: (v: ProjectStatus) => <Tag color={statusColor[v]}>{v}</Tag> },
    {
      title: '操作', fixed: 'right', width: 210,
      render: (_, row) => <Space size={4}>
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/app/project-application/detail/${row.id}`)}>详情</Button>
        {(row.status === '草稿' || row.status === '撤销修改') && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/app/project-application/edit/${row.id}`)}>编辑</Button>}
        {(row.status === '草稿' || row.status === '撤销修改') && <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(row)}>删除</Button>}
        {row.status === '待审核' && isAdmin && <Button type="link" size="small" onClick={() => { updateStatus(row, '审核中'); navigate(`/app/project-application/audit/${row.id}`); }}>审核</Button>}
        {row.status === '审核中' && isAdmin && <Button type="link" size="small" onClick={() => navigate(`/app/project-application/audit/${row.id}`)}>审核</Button>}
        {row.status === '待审核' && !isAdmin && <Button type="link" danger size="small" onClick={() => updateStatus(row, '撤销修改')}>撤销</Button>}
      </Space>,
    },
  ];

  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <PageHeader title="立项申报管理中心" subTitle="统一管理智能体项目的立项申报与审批流程" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/app/project-application/create')}>立项申报</Button>} />
    <Card bordered={false}>
      <Space wrap style={{ marginBottom: 18 }}>
        <Input allowClear prefix={<SearchOutlined />} placeholder="搜索项目名称" style={{ width: 280 }} value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <Select allowClear placeholder="申报科室" options={departmentOptions} style={{ width: 180 }} onChange={(v) => setDepartment(v || '')} />
        <Select allowClear placeholder="申报赛道" options={tracks.map((v) => ({ label: v, value: v }))} style={{ width: 160 }} onChange={(v) => setTrack(v || '')} />
        <Button onClick={() => { setKeyword(''); setDepartment(''); setTrack(''); }}>重置筛选</Button>
      </Space>
      <Tabs activeKey={active} onChange={(key) => setSearchParams(key === '全部立项' ? {} : { status: key })} items={statuses.map((status) => ({ key: status, label: <span>{status} <Tag bordered={false}>{records.filter((r) => status === '全部立项' || r.status === status).length}</Tag></span> }))} />
      <Table rowKey="id" columns={columns} dataSource={scopedRecords} scroll={{ x: 1450 }} pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }} />
    </Card>
  </Space>;
}

interface ProjectFormValues extends Omit<ProjectRecord, 'id' | 'status' | 'applicant' | 'updateTime' | 'files'> {
  applicationFiles?: UploadFile[];
  evidenceFiles?: UploadFile[];
}

export function ProjectApplicationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const editing = getRecord(id);
  const [form] = Form.useForm<ProjectFormValues>();
  const [submitting, setSubmitting] = useState(false);

  const initialValues: Partial<ProjectFormValues> = editing ? {
    ...editing,
    applicationFiles: editing.files.slice(0, 1).map((name, i) => ({ uid: `${i}`, name, status: 'done' })),
    evidenceFiles: editing.files.slice(1).map((name, i) => ({ uid: `e${i}`, name, status: 'done' })),
  } : { track: '助医赛道', supports: [], technologies: [], models: [], totalBudget: 0 };
  const normFile = (e: { fileList?: UploadFile[] } | UploadFile[]) => Array.isArray(e) ? e : e?.fileList;
  const beforeUpload = (file: File) => {
    if (file.type !== 'application/pdf') { message.error('上传失败，仅支持PDF类型文件'); return Upload.LIST_IGNORE; }
    if (file.size / 1024 / 1024 > 30) { message.error('上传失败，单文件超过最大限制30M'); return Upload.LIST_IGNORE; }
    message.success('上传成功'); return false;
  };
  const persist = async (status: ProjectStatus) => {
    setSubmitting(true);
    try {
      const values = status === '草稿' ? form.getFieldsValue(true) : await form.validateFields();
      const applicationFiles = values.applicationFiles || [];
      if (status !== '草稿' && !applicationFiles.length) {
        form.setFields([{ name: 'applicationFiles', errors: ['请上传项目申报书'] }]);
        message.error('请检查立项申报表单信息是否填写完整'); return;
      }
      const record: ProjectRecord = {
        ...(editing || {} as ProjectRecord),
        ...values,
        id: editing?.id || `PA-2026-${String(Date.now()).slice(-4)}`,
        name: values.name || '未命名立项申报',
        department: values.department || '',
        superiorDepartment: values.superiorDepartment || '',
        track: values.track || '',
        leader: values.leader || '',
        contact: values.contact || '',
        phone: values.phone || '',
        supports: values.supports || [],
        overview: values.overview || '',
        painPoints: values.painPoints || '',
        technologies: values.technologies || [],
        models: values.models || [],
        deliverables: values.deliverables || '',
        indicators: values.indicators || '',
        totalBudget: Number(values.totalBudget || 0),
        fundingDetail: values.fundingDetail || '',
        spendingDetail: values.spendingDetail || '',
        status,
        applicant: editing?.applicant || currentUser?.name || '当前用户',
        updateTime: now(),
        submitTime: status === '待审核' ? now() : editing?.submitTime,
        files: [...applicationFiles, ...(values.evidenceFiles || [])].map((file) => file.name),
      };
      delete (record as unknown as Record<string, unknown>).applicationFiles;
      delete (record as unknown as Record<string, unknown>).evidenceFiles;
      saveRecord(record);
      message.success(status === '草稿' ? '注册表单填写记录已暂存至草稿状态列表页' : '提交成功');
      navigate(`/app/project-application${status === '草稿' ? '?status=草稿' : '?status=待审核'}`);
    } catch {
      message.error('请检查立项申报表单信息是否填写完整');
    } finally { setSubmitting(false); }
  };

  const required = { required: true, message: '此项为必填项' };
  return <div className="project-form-page">
    <PageHeader
      showBack
      onBack={() => navigate(-1)}
      title={editing ? '编辑立项申报' : '立项申报'}
      subTitle="填写申报材料、项目基本信息、项目内容信息与经费预算后提交审核"
      breadcrumb={[
        { path: '/app/project-application', breadcrumbName: '立项申报管理中心' },
        { path: '', breadcrumbName: editing ? '编辑立项申报' : '立项申报' },
      ]}
    />
    <div className="project-form-shell">
      <main className="project-form-main">
        <Form form={form} layout="vertical" initialValues={initialValues} scrollToFirstError requiredMark>
          <Card id="materials" title="① 立项材料上传" style={{ marginBottom: 16 }}>
            <Row gutter={[20, 16]}>
              <Col xs={24} md={12}><Form.Item label="项目申报书" name="applicationFiles" valuePropName="fileList" getValueFromEvent={normFile} rules={[required]}>
                <Upload.Dragger beforeUpload={beforeUpload} maxCount={1} className="project-upload-compact">
                  <p className="ant-upload-drag-icon"><FilePdfOutlined /></p>
                  <p className="ant-upload-text">点击或拖拽 PDF（项目申报书）</p>
                  <p className="ant-upload-hint">必填 · 单文件 ≤ 30M · 限 1 份</p>
                </Upload.Dragger>
              </Form.Item></Col>
              <Col xs={24} md={12}><Form.Item label="其他证明材料" name="evidenceFiles" valuePropName="fileList" getValueFromEvent={normFile}>
                <Upload.Dragger beforeUpload={beforeUpload} multiple className="project-upload-compact">
                  <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                  <p className="ant-upload-text">点击或拖拽 PDF（其他证明材料）</p>
                  <p className="ant-upload-hint">选填 · 单文件 ≤ 30M · 支持多份</p>
                </Upload.Dragger>
              </Form.Item></Col>
            </Row>
            <Space direction="vertical" size={4}>
              <Button icon={<DownloadOutlined />} onClick={() => message.success('项目申报书模板已开始下载')}>模板下载</Button>
              <Text type="secondary" style={{ fontSize: 12 }}>限定 PDF 格式 · 单文件不超过 30M · 支持多文件上传</Text>
            </Space>
          </Card>

          <Card id="basic" title="② 项目基本信息" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} lg={12}><Form.Item label="项目名称" name="name" rules={[required, { min: 2, max: 50 }]}><Input showCount maxLength={50} placeholder="请输入 2-50 个字符的项目名称" /></Form.Item></Col>
              <Col xs={24} sm={12} lg={6}><Form.Item label="申报科室" name="department" rules={[required]}><Select showSearch options={departmentOptions} placeholder="请选择申报科室" /></Form.Item></Col>
              <Col xs={24} sm={12} lg={6}><Form.Item label="上级部门" name="superiorDepartment" rules={[required]}><Select options={['数智发展处', '科研处', '临床研究中心', '医务处'].map((v) => ({ label: v, value: v }))} placeholder="请选择上级部门" /></Form.Item></Col>
              <Col xs={24} lg={12}><Form.Item label="申报赛道" name="track" rules={[required]}><Radio.Group className="project-option-buttons" options={tracks} optionType="button" buttonStyle="solid" /></Form.Item></Col>
              <Col xs={24} sm={8} lg={4}><Form.Item label="项目负责人" name="leader" rules={[required, { min: 2, max: 10 }]}><Input showCount maxLength={10} placeholder="请输入姓名" /></Form.Item></Col>
              <Col xs={24} sm={8} lg={4}><Form.Item label="项目联系人" name="contact" rules={[required, { min: 2, max: 10 }]}><Input showCount maxLength={10} placeholder="请输入姓名" /></Form.Item></Col>
              <Col xs={24} sm={8} lg={4}><Form.Item label="联系方式" name="phone" rules={[required, { pattern: /^1\d{10}$/, message: '请输入正确的11位手机号' }]}><Input maxLength={11} placeholder="11 位手机号" /></Form.Item></Col>
              <Col span={24}><Form.Item label="希望获取的支持" name="supports" rules={[required]}><Checkbox.Group options={supportOptions} /></Form.Item></Col>
            </Row>
          </Card>

          <Card id="content" title="③ 项目内容信息" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} lg={12}><Form.Item label="项目概述" name="overview" rules={[required]}><TextArea rows={5} showCount maxLength={300} placeholder="说明立项背景、项目目标、技术方案与预期成效" /></Form.Item></Col>
              <Col xs={24} lg={12}><Form.Item label="项目解决的痛点问题" name="painPoints" rules={[required]}><TextArea rows={5} showCount maxLength={200} placeholder="描述项目拟解决的效率、成本、质量或流程问题" /></Form.Item></Col>
              <Col span={24}><Form.Item label="项目运用的核心技术" name="technologies" rules={[required]}><Checkbox.Group options={technologyOptions} /></Form.Item></Col>
              <Col span={24}><Form.Item label="项目运用的大模型" name="models" rules={[required]}><Checkbox.Group options={modelOptions} /></Form.Item></Col>
              <Col xs={24} lg={12}><Form.Item label="项目完成形式" name="deliverables" rules={[required]}><TextArea rows={4} placeholder="说明智能体、知识库、模型训练等具体产出物" /></Form.Item></Col>
              <Col xs={24} lg={12}><Form.Item label="考核指标" name="indicators" rules={[required]}><TextArea rows={4} placeholder="按技术性能、知识产权、经济和社会效益等维度填写" /></Form.Item></Col>
            </Row>
          </Card>

          <Card id="budget" title="④ 项目经费预算" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={8}><Form.Item label="已有经费来源合计" name="totalBudget" rules={[required]}><InputNumber min={0} precision={2} addonAfter="万元" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={24}><Form.Item label="具体来源明细" name="fundingDetail" rules={[required]}><TextArea rows={3} placeholder="例如：医院资助 20 万元；其他渠道资助 10 万元" /></Form.Item></Col>
              <Col span={24}><Form.Item label="具体使用明细" name="spendingDetail" rules={[required]}><TextArea rows={3} placeholder="请填写软硬件购置、研发设计、系统集成等费用明细" /></Form.Item></Col>
            </Row>
          </Card>

          <Card
            size="small"
            style={{ position: 'sticky', bottom: 0, zIndex: 10, marginBottom: 0, boxShadow: '0 -2px 8px rgba(0,0,0,0.06)' }}
            styles={{ body: { padding: '12px 16px' } }}
          >
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                <Button icon={<SaveOutlined />} onClick={() => persist('草稿')}>暂存</Button>
                <Button onClick={() => navigate(-1)}>返回列表</Button>
              </Space>
              <Button type="primary" icon={<SendOutlined />} loading={submitting} onClick={() => persist('待审核')}>提交申报</Button>
            </Space>
          </Card>
        </Form>
      </main>
    </div>
  </div>;
}

function RecordContent({ record }: { record: ProjectRecord }) {
  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Card title="立项材料" bordered={false}>
      <Space direction="vertical">{record.files.map((file) => <Space key={file}><FilePdfOutlined style={{ color: '#ff4d4f' }} /><Button type="link" onClick={() => message.info(`正在预览：${file}`)}>{file}</Button><Button type="link" icon={<DownloadOutlined />}>下载</Button></Space>)}</Space>
    </Card>
    <Card title="项目基本信息" bordered={false}><Descriptions column={3} labelStyle={{ color: '#8c8c8c' }}>
      <Descriptions.Item label="项目名称" span={2}>{record.name}</Descriptions.Item><Descriptions.Item label="立项状态"><Tag color={statusColor[record.status]}>{record.status}</Tag></Descriptions.Item>
      <Descriptions.Item label="申报科室">{record.department}</Descriptions.Item><Descriptions.Item label="上级部门">{record.superiorDepartment}</Descriptions.Item><Descriptions.Item label="申报赛道">{record.track}</Descriptions.Item>
      <Descriptions.Item label="项目负责人">{record.leader}</Descriptions.Item><Descriptions.Item label="项目联系人">{record.contact}</Descriptions.Item><Descriptions.Item label="联系方式">{record.phone}</Descriptions.Item>
      <Descriptions.Item label="希望获取的支持" span={3}>{record.supports.map((v) => <Tag key={v}>{v}</Tag>)}</Descriptions.Item>
    </Descriptions></Card>
    <Card title="项目内容信息" bordered={false}><Descriptions column={1} labelStyle={{ width: 170, color: '#8c8c8c' }}>
      <Descriptions.Item label="项目概述"><Paragraph>{record.overview}</Paragraph></Descriptions.Item><Descriptions.Item label="项目解决的痛点问题"><Paragraph>{record.painPoints}</Paragraph></Descriptions.Item>
      <Descriptions.Item label="核心技术">{record.technologies.map((v) => <Tag color="blue" key={v}>{v}</Tag>)}</Descriptions.Item><Descriptions.Item label="使用的大模型">{record.models.map((v) => <Tag color="geekblue" key={v}>{v}</Tag>)}</Descriptions.Item>
      <Descriptions.Item label="项目完成形式">{record.deliverables}</Descriptions.Item><Descriptions.Item label="考核指标">{record.indicators}</Descriptions.Item>
    </Descriptions></Card>
    <Card title="项目经费预算" bordered={false}><Descriptions column={1} labelStyle={{ width: 170, color: '#8c8c8c' }}>
      <Descriptions.Item label="已有经费来源合计">{record.totalBudget} 万元</Descriptions.Item><Descriptions.Item label="具体来源明细">{record.fundingDetail}</Descriptions.Item><Descriptions.Item label="具体使用明细">{record.spendingDetail}</Descriptions.Item>
    </Descriptions></Card>
  </Space>;
}

export function ProjectApplicationDetail() {
  const { id } = useParams(); const navigate = useNavigate(); const record = getRecord(id);
  if (!record) return <Card><Text type="secondary">未找到该立项申报记录</Text></Card>;
  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <PageHeader showBack onBack={() => navigate(-1)} title="立项信息详情" subTitle={`${record.id} · ${record.name}`} />
    <RecordContent record={record} />
    {record.reviewNote && <Card title="审核结论" bordered={false}><Descriptions><Descriptions.Item label="结论"><Tag color={statusColor[record.status]}>{record.status}</Tag></Descriptions.Item><Descriptions.Item label="具体说明">{record.reviewNote}</Descriptions.Item></Descriptions></Card>}
    <Card bordered={false} style={{ textAlign: 'right' }}><Button onClick={() => navigate(-1)}>返回</Button></Card>
  </Space>;
}

export function ProjectApplicationAudit() {
  const { id } = useParams(); const navigate = useNavigate(); const record = getRecord(id);
  const [conclusion, setConclusion] = useState<'立项通过' | '立项不通过'>('立项通过');
  const [note, setNote] = useState(record?.reviewNote || '');
  if (!record) return <Card><Text type="secondary">未找到该立项申报记录</Text></Card>;
  const submitAudit = () => {
    if (!conclusion) { message.error('请选择审核结论'); return; }
    Modal.confirm({
      title: `确认是否${conclusion}？`, okText: '是', cancelText: '否',
      onOk: () => {
        saveRecord({ ...record, status: conclusion, reviewNote: note, finishTime: now(), updateTime: now() });
        message.success(`审核完成：${conclusion}`);
        navigate(`/app/project-application?status=${conclusion}`);
      },
    });
  };
  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <PageHeader showBack onBack={() => navigate(-1)} title="立项信息审核" subTitle="审核申报信息并给出立项结论" />
    <RecordContent record={record} />
    <Card title="审核结论" bordered={false}>
      <Form layout="vertical"><Form.Item label="审核结论" required><Radio.Group value={conclusion} onChange={(e) => setConclusion(e.target.value)}><Radio value="立项通过">立项通过</Radio><Radio value="立项不通过">立项不通过</Radio></Radio.Group></Form.Item>
      <Divider /><Form.Item label="具体说明" extra={`${note.length}/500`}><TextArea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={5} placeholder={conclusion === '立项通过' ? '请填写通过意见或后续工作要求' : '请填写不通过原因及修改建议'} /></Form.Item></Form>
    </Card>
    <Card bordered={false} style={{ textAlign: 'right' }}><Space><Button onClick={() => navigate(-1)}>取消</Button><Button type={conclusion === '立项通过' ? 'primary' : 'default'} danger={conclusion === '立项不通过'} onClick={submitAudit}>{conclusion}</Button></Space></Card>
  </Space>;
}
