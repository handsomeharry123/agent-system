import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Dropdown,
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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FilePdfOutlined,
  MoreOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
  SendOutlined,
  ThunderboltFilled,
  UploadOutlined,
} from '@ant-design/icons';
import PageHeader from '../../components/PageHeader';
import { departmentOptions } from '../../mock/departments';
import { useAuth } from '../../hooks/useAuth';
import { useSmartDraft } from '../agent-center/smart/store';
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
  assessmentIndicators?: AssessmentIndicators;
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

type IndicatorItem = { content: string };
type AssessmentIndicators = {
  technical: IndicatorItem[];
  intellectualProperty: IndicatorItem[];
  economicSocial: IndicatorItem[];
  other: IndicatorItem[];
};

const STORAGE_KEY = 'project-application-demo-v1';
const now = () => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
const seedData: ProjectRecord[] = [
  { id: 'PA-2026-001', name: '超声检查智能预约与检前指导项目', department: '超声科', superiorDepartment: '数智发展处', track: '助医赛道', leader: '周明远', contact: '林佳', phone: '13800138001', supports: ['算力支持', '技术指导支持'], overview: '建设面向患者的超声检查智能预约与检前指导智能体，联动院内预约系统，提升检查准备质量与就诊效率。', painPoints: '预约规则复杂、患者准备不充分，重复咨询量高，现场改约影响检查效率。', technologies: ['自然语言处理', '知识图谱'], models: ['Qwen模型'], deliverables: '形成 1 个预约指导智能体、1 套专科知识库及院内预约接口。', indicators: '预约咨询人工工作量降低 40%，检查准备合格率提升至 95%。', totalBudget: 36, fundingDetail: '医院资助 20 万元；其它渠道资助 16 万元', spendingDetail: '软件购置 12 万元；系统集成 4 万元；研发设计 20 万元', status: '待审核', applicant: '钱文博', updateTime: '2026-07-25 14:30:00', submitTime: '2026-07-25 14:30:00', files: ['超声检查智能预约项目申报书.pdf'] },
  { id: 'PA-2026-002', name: '住院病历智能生成项目', department: '医务处', superiorDepartment: '医务处', track: '助医赛道', leader: '郑雅婷', contact: '陈晨', phone: '13912345678', supports: ['数据要素支持', '算力支持'], overview: '面向住院医生提供结构化病历辅助生成与质量校验。', painPoints: '病历书写耗时长，质量一致性有待提升。', technologies: ['自然语言处理', '大模型'], models: ['Deepseek模型'], deliverables: '1 个病历生成智能体与 2 个专科知识库。', indicators: '病历书写时间降低 30%。', totalBudget: 58, fundingDetail: '医院资助 58 万元', spendingDetail: '算力租赁 20 万元；研发设计 38 万元', status: '审核中', applicant: '钱文博', updateTime: '2026-07-24 11:20:00', submitTime: '2026-07-24 11:20:00', files: ['住院病历智能生成项目申报书.pdf', '数据安全评估说明.pdf'] },
  { id: 'PA-2026-003', name: '手术麻醉风险智能评估项目', department: '麻醉科', superiorDepartment: '临床研究中心', track: '促研赛道', leader: '刘晓燕', contact: '周一帆', phone: '13788990012', supports: ['资金支持', '数据要素支持'], overview: '基于多模态数据构建围术期麻醉风险预测模型。', painPoints: '风险评估依赖人工经验，跨系统信息整合难。', technologies: ['多模态', '机器学习'], models: ['LLaMa模型'], deliverables: '风险评估模型 1 套、临床决策支持智能体 1 个。', indicators: '高风险识别召回率不低于 90%。', totalBudget: 80, fundingDetail: '市卫健委资助 50 万元；医院资助 30 万元', spendingDetail: '硬件设备 30 万元；研发设计 50 万元', status: '立项通过', applicant: '钱文博', updateTime: '2026-07-18 16:10:00', submitTime: '2026-07-10 09:15:00', finishTime: '2026-07-18 16:10:00', reviewNote: '项目方案完整，临床价值明确，同意立项。', files: ['手术麻醉风险智能评估项目申报书.pdf'] },
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

const escapeHtml = (value: string | number) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');

const buildApplicationHtml = (record: ProjectRecord) => `
  <div style="width:720px;padding:36px 44px;box-sizing:border-box;background:#fff;color:#1f1f1f;font-family:'Microsoft YaHei','PingFang SC',sans-serif;">
    <h1 style="margin:0 0 8px;text-align:center;font-size:24px;">项目申报书</h1>
    <p style="margin:0 0 28px;text-align:center;color:#888;">${escapeHtml(record.id)}</p>
    <h2 style="font-size:16px;border-left:4px solid #1677ff;padding-left:8px;">一、项目基本信息</h2>
    <table border="1" cellpadding="8" cellspacing="0" bordercolor="#e5e5e5" style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="width:140px;background:#fafafa;">项目名称</td><td>${escapeHtml(record.name)}</td></tr>
      <tr><td style="background:#fafafa;">申报科室</td><td>${escapeHtml(record.department)}</td></tr>
      <tr><td style="background:#fafafa;">上级部门</td><td>${escapeHtml(record.superiorDepartment)}</td></tr>
      <tr><td style="background:#fafafa;">申报赛道</td><td>${escapeHtml(record.track)}</td></tr>
      <tr><td style="background:#fafafa;">项目负责人</td><td>${escapeHtml(record.leader)}</td></tr>
      <tr><td style="background:#fafafa;">项目联系人</td><td>${escapeHtml(record.contact)}（${escapeHtml(record.phone)}）</td></tr>
      <tr><td style="background:#fafafa;">希望获取的支持</td><td>${escapeHtml(record.supports.join('、'))}</td></tr>
    </table>
    <h2 style="margin-top:24px;font-size:16px;border-left:4px solid #1677ff;padding-left:8px;">二、项目内容</h2>
    <p><b>项目概述：</b>${escapeHtml(record.overview)}</p>
    <p><b>痛点问题：</b>${escapeHtml(record.painPoints)}</p>
    <p><b>核心技术：</b>${escapeHtml(record.technologies.join('、'))}</p>
    <p><b>使用的大模型：</b>${escapeHtml(record.models.join('、'))}</p>
    <p><b>项目完成形式：</b>${escapeHtml(record.deliverables)}</p>
    <p><b>考核指标：</b>${escapeHtml(record.indicators)}</p>
    <h2 style="margin-top:24px;font-size:16px;border-left:4px solid #1677ff;padding-left:8px;">三、项目经费预算</h2>
    <p><b>经费合计：</b>${escapeHtml(record.totalBudget)} 万元</p>
    <p><b>来源明细：</b>${escapeHtml(record.fundingDetail)}</p>
    <p><b>使用明细：</b>${escapeHtml(record.spendingDetail)}</p>
  </div>`;

const downloadApplication = async (record: ProjectRecord, fileName?: string) => {
  const targetName = fileName || `${record.name}项目申报书.pdf`;
  if (/\.docx?$/i.test(targetName)) {
    const html = `<!DOCTYPE html><html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${escapeHtml(record.name)}</title></head><body>${buildApplicationHtml(record)}</body></html>`;
    const url = URL.createObjectURL(new Blob(['\ufeff', html], { type: 'application/msword' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = targetName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.innerHTML = buildApplicationHtml(record);
  document.body.appendChild(wrapper);
  try {
    const canvas = await html2canvas(wrapper.firstElementChild as HTMLElement, {
      scale: 1.5,
      backgroundColor: '#fff',
      logging: false,
    });
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageHeight = canvas.height * pageWidth / canvas.width;
    const image = canvas.toDataURL('image/jpeg', 0.92);
    for (let offset = 0, page = 0; offset < imageHeight; offset += pageHeight, page += 1) {
      if (page > 0) pdf.addPage();
      pdf.addImage(image, 'JPEG', 0, -offset, pageWidth, imageHeight, undefined, 'FAST');
    }
    pdf.save(targetName.replace(/\.[^.]+$/, '.pdf'));
  } finally {
    wrapper.remove();
  }
};

const statusColor: Record<ProjectStatus, string> = {
  草稿: 'default', 待审核: 'processing', 审核中: 'cyan',
  撤销修改: 'orange', 立项不通过: 'error', 立项通过: 'success',
};
const statuses: Array<'全部立项' | ProjectStatus> = ['全部立项', '草稿', '待审核', '审核中', '撤销修改', '立项通过', '立项不通过'];
const tracks = ['便民赛道', '助医赛道', '辅政赛道', '促研赛道', '其他'];
const supportOptions = ['资金支持', '算力支持', '数据要素支持', '项目推广', '技术指导支持', '其他'];
const technologyOptions = ['计算机视觉', '智能语音', '多模态', '边缘计算', '数字孪生', '自然语言处理', '知识图谱', '机器学习', '隐私计算', '高性能计算', '其他'];
const modelOptions = ['GPT模型', 'Claude模型', 'LLaMa模型', 'Gemini模型', 'Deepseek模型', 'Qwen模型', '豆包模型', 'Kimi模型', 'Grok模型', '其他'];
const indicatorDimensions: Array<{
  key: keyof AssessmentIndicators;
  title: string;
  placeholder: string;
}> = [
  { key: 'technical', title: '技术性能', placeholder: '例如：核心场景识别准确率不低于 95%' },
  { key: 'intellectualProperty', title: '知识产权', placeholder: '例如：申请软件著作权 2 项' },
  { key: 'economicSocial', title: '经济和社会效益', placeholder: '例如：业务处理效率提升 30%' },
  { key: 'other', title: '其他', placeholder: '请输入其他考核指标' },
];

const emptyAssessmentIndicators = (): AssessmentIndicators => ({
  technical: [{ content: '' }],
  intellectualProperty: [{ content: '' }],
  economicSocial: [{ content: '' }],
  other: [{ content: '' }],
});

const indicatorsToText = (indicators?: AssessmentIndicators) => {
  if (!indicators) return '';
  return indicatorDimensions
    .map(({ key, title }) => {
      const items = indicators[key].map((item) => item?.content?.trim()).filter(Boolean);
      return items.length ? `${title}：${items.join('；')}` : '';
    })
    .filter(Boolean)
    .join('\n');
};

export default function ProjectApplication() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.roles.includes('信息科管理员') ?? false;
  const { pushWelcomeGreeting, consumeWelcome } = useSmartDraft();
  const [records, setRecords] = useState(readRecords);
  const [keyword, setKeyword] = useState('');
  const [department, setDepartment] = useState('');
  const [track, setTrack] = useState('');
  const active = (searchParams.get('status') as ProjectStatus) || '全部立项';
  const visibleDrafts = useMemo(
    () => records.filter((item) =>
      item.status === '草稿' &&
      (isAdmin || item.applicant === currentUser?.name || item.applicant === 'admin')
    ),
    [currentUser?.name, isAdmin, records],
  );
  const pendingRecords = useMemo(
    () => records.filter((item) =>
      item.status === '待审核' &&
      (isAdmin || item.applicant === currentUser?.name || item.applicant === 'admin')
    ),
    [currentUser?.name, isAdmin, records],
  );
  const reviewingRecords = useMemo(
    () => records.filter((item) =>
      item.status === '审核中' &&
      (isAdmin || item.applicant === currentUser?.name || item.applicant === 'admin')
    ),
    [currentUser?.name, isAdmin, records],
  );
  const revokedRecords = useMemo(
    () => records.filter((item) =>
      item.status === '撤销修改' &&
      (isAdmin || item.applicant === currentUser?.name || item.applicant === 'admin')
    ),
    [currentUser?.name, isAdmin, records],
  );
  const rejectedRecords = useMemo(
    () => records.filter((item) =>
      item.status === '立项不通过' &&
      (isAdmin || item.applicant === currentUser?.name || item.applicant === 'admin')
    ),
    [currentUser?.name, isAdmin, records],
  );
  const passedRecords = useMemo(
    () => records.filter((item) =>
      item.status === '立项通过' &&
      (isAdmin || item.applicant === currentUser?.name || item.applicant === 'admin')
    ),
    [currentUser?.name, isAdmin, records],
  );

  useEffect(() => {
    if (active === '立项不通过') {
      const firstRejectedRecord = rejectedRecords[0];
      pushWelcomeGreeting(
        'project-application-rejected',
        isAdmin ? 'admin' : 'dept',
        () => [rejectedRecords.length],
        {
          actions: [{
            key: 'view-rejected-project-detail',
            label: '查看详情',
            path: firstRejectedRecord
              ? `/app/project-application/detail/${firstRejectedRecord.id}`
              : undefined,
            enabled: Boolean(firstRejectedRecord),
            reason: firstRejectedRecord ? undefined : '当前暂无立项不通过的申报',
          }],
        },
      );
      return () => consumeWelcome();
    }
    if (active === '立项通过') {
      const firstPassedRecord = passedRecords[0];
      pushWelcomeGreeting(
        'project-application-passed',
        isAdmin ? 'admin' : 'dept',
        () => [passedRecords.length],
        {
          actions: [{
            key: 'view-passed-project-detail',
            label: '查看详情',
            path: firstPassedRecord
              ? `/app/project-application/detail/${firstPassedRecord.id}`
              : undefined,
            enabled: Boolean(firstPassedRecord),
            reason: firstPassedRecord ? undefined : '当前暂无立项通过的申报',
          }],
        },
      );
      return () => consumeWelcome();
    }
    if (active === '撤销修改') {
      const detailRecord = revokedRecords[0];
      pushWelcomeGreeting(
        'project-application-revoked',
        isAdmin ? 'admin' : 'dept',
        () => [revokedRecords.length],
        {
          actions: [{
            key: 'view-revoked-project-detail',
            label: '查看详情',
            path: detailRecord ? `/app/project-application/detail/${detailRecord.id}` : undefined,
            enabled: Boolean(detailRecord),
            reason: '当前没有撤销修改的立项申报',
          }],
        },
      );
      return () => consumeWelcome();
    }
    if (active === '待审核') {
      pushWelcomeGreeting(
        'project-application-pending',
        isAdmin ? 'admin' : 'dept',
        () => [pendingRecords.length],
        {
          miniList: {
            toggleLabel: `查看这${pendingRecords.length}项`,
            targetTab: '待审核',
            totalCount: pendingRecords.length,
            rows: pendingRecords.map((record) => ({
              recordId: record.id,
              title: record.name,
              subTitle: `申报科室：${record.department || '--'}`,
              meta: `希望获取支持：${record.supports.join('、') || '--'}`,
              actions: isAdmin ? [
                {
                  key: `detail-project-${record.id}`,
                  label: '查看详情',
                  kind: 'navigate-detail',
                  path: `/app/project-application/detail/${record.id}`,
                },
                {
                  key: `audit-project-${record.id}`,
                  label: '审核',
                  kind: 'navigate-audit',
                  path: `/app/project-application/audit/${record.id}`,
                },
              ] : [
                {
                  key: `detail-project-${record.id}`,
                  label: '查看详情',
                  kind: 'navigate-detail',
                  path: `/app/project-application/detail/${record.id}`,
                },
                {
                  key: `revoke-project-${record.id}`,
                  label: '撤销',
                  kind: 'confirm-revoke',
                  danger: true,
                },
              ],
            })),
          },
        },
      );
      return () => consumeWelcome();
    }
    if (active === '审核中') {
      pushWelcomeGreeting(
        'project-application-reviewing',
        isAdmin ? 'admin' : 'dept',
        () => [reviewingRecords.length],
        {
          miniList: {
            toggleLabel: `查看这${reviewingRecords.length}项`,
            targetTab: '审核中',
            totalCount: reviewingRecords.length,
            rows: reviewingRecords.map((record) => ({
              recordId: record.id,
              title: record.name,
              subTitle: `申报科室：${record.department || '--'}`,
              meta: `希望获取支持：${record.supports.join('、') || '--'}`,
              actions: isAdmin ? [
                {
                  key: `detail-reviewing-project-${record.id}`,
                  label: '查看详情',
                  kind: 'navigate-detail',
                  path: `/app/project-application/detail/${record.id}`,
                },
                {
                  key: `audit-reviewing-project-${record.id}`,
                  label: '审核',
                  kind: 'navigate-audit',
                  path: `/app/project-application/audit/${record.id}`,
                },
              ] : [
                {
                  key: `detail-reviewing-project-${record.id}`,
                  label: '查看详情',
                  kind: 'navigate-detail',
                  path: `/app/project-application/detail/${record.id}`,
                },
                {
                  key: `revoke-reviewing-project-${record.id}`,
                  label: '撤销',
                  kind: 'confirm-revoke',
                  danger: true,
                },
              ],
            })),
          },
        },
      );
      return () => consumeWelcome();
    }
    if (active === '草稿') {
      pushWelcomeGreeting(
        'project-application-draft',
        isAdmin ? 'admin' : 'dept',
        () => [visibleDrafts.length],
        {
          miniList: {
            toggleLabel: '查看未完成的立项申报草稿',
            targetTab: '草稿',
            totalCount: visibleDrafts.length,
            rows: visibleDrafts.map((draft) => ({
              recordId: draft.id,
              title: draft.name || '未命名立项申报',
              subTitle: `申报科室：${draft.department || '--'}`,
              meta: `希望获取支持：${draft.supports.join('、') || '--'}`,
              actions: [{
                key: `edit-project-${draft.id}`,
                label: '编辑',
                kind: 'navigate-edit',
                path: `/app/project-application/edit/${draft.id}`,
              }],
            })),
          },
        },
      );
      return () => consumeWelcome();
    }
    if (active !== '全部立项') return undefined;
    const count = (status: ProjectStatus) => records.filter((item) => item.status === status).length;
    pushWelcomeGreeting(
      'project-application-all',
      isAdmin ? 'admin' : 'dept',
      () => [records.length, count('待审核'), count('立项通过'), count('立项不通过')],
      {
        chips: [
          { key: 'pending', label: `待审核 ${count('待审核')}项`, targetTab: '待审核', tone: 'warning' },
          { key: 'passed', label: `立项通过 ${count('立项通过')}项`, targetTab: '立项通过', tone: 'success' },
          { key: 'rejected', label: `立项不通过 ${count('立项不通过')}项`, targetTab: '立项不通过', tone: 'error' },
        ],
        actions: [
          { key: 'create-project', label: '立项申报', path: '/app/project-application/create', enabled: true },
        ],
      },
    );
    return () => consumeWelcome();
  }, [active, consumeWelcome, isAdmin, passedRecords, pendingRecords, pushWelcomeGreeting, records, rejectedRecords, revokedRecords, reviewingRecords, visibleDrafts]);

  useEffect(() => {
    const onJump = (event: Event) => {
      const status = (event as CustomEvent<string>).detail;
      if (statuses.includes(status as ProjectStatus)) {
        setSearchParams(status === '全部立项' ? {} : { status });
      }
    };
    window.addEventListener('agent-jump-tab', onJump);
    return () => window.removeEventListener('agent-jump-tab', onJump);
  }, [setSearchParams]);

  useEffect(() => {
    const onDraftAction = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; path?: string; recordId?: string }>).detail;
      if ((active === '草稿' || active === '撤销修改') && detail?.kind === 'navigate-edit' && detail.path) {
        navigate(detail.path);
      }
      if (
        (active === '待审核' || active === '审核中') &&
        (detail?.kind === 'navigate-detail' || detail?.kind === 'navigate-audit') &&
        detail.path
      ) {
        navigate(detail.path);
      }
      if ((active === '待审核' || active === '审核中') && !isAdmin && detail?.kind === 'confirm-revoke' && detail.recordId) {
        const record = records.find((item) => item.id === detail.recordId);
        if (!record) return;
        Modal.confirm({
          title: '确认撤销立项申报？',
          content: `撤销后，“${record.name}”将进入“撤销修改”页，可修改后重新提交。`,
          okText: '确认撤销',
          cancelText: '取消',
          okButtonProps: { danger: true },
          onOk: () => updateStatus(record, '撤销修改'),
        });
      }
    };
    window.addEventListener('agent-bubble-row-action', onDraftAction);
    return () => window.removeEventListener('agent-bubble-row-action', onDraftAction);
  }, [active, isAdmin, navigate, records]);

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
      title: '操作', fixed: 'right', width: active === '全部立项' ? 150 : 210,
      render: (_, row) => {
        const detailButton = (
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/app/project-application/detail/${row.id}`)}>
            详情
          </Button>
        );

        if (active === '全部立项') {
          const moreItems = [];
          if (row.status === '草稿' || row.status === '撤销修改') {
            moreItems.push(
              { key: 'edit', label: '编辑', icon: <EditOutlined /> },
              { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true },
            );
          }
          if ((row.status === '待审核' || row.status === '审核中') && isAdmin) {
            moreItems.push({ key: 'audit', label: '审核' });
          }
          if (row.status === '待审核' && !isAdmin) {
            moreItems.push({ key: 'revoke', label: '撤销', danger: true });
          }
          if (moreItems.length === 0) {
            moreItems.push({ key: 'empty', label: '暂无更多操作', disabled: true });
          }

          return (
            <Space size={4}>
              {detailButton}
              <Dropdown
                trigger={['click']}
                menu={{
                  items: moreItems,
                  onClick: ({ key }) => {
                    if (key === 'edit') navigate(`/app/project-application/edit/${row.id}`);
                    if (key === 'delete') remove(row);
                    if (key === 'audit') {
                      if (row.status === '待审核') updateStatus(row, '审核中');
                      navigate(`/app/project-application/audit/${row.id}`);
                    }
                    if (key === 'revoke') updateStatus(row, '撤销修改');
                  },
                }}
              >
                <Button type="link" size="small" icon={<MoreOutlined />}>更多</Button>
              </Dropdown>
            </Space>
          );
        }

        return <Space size={4}>
          {detailButton}
          {(row.status === '草稿' || row.status === '撤销修改') && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/app/project-application/edit/${row.id}`)}>编辑</Button>}
          {(row.status === '草稿' || row.status === '撤销修改') && <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(row)}>删除</Button>}
          {row.status === '待审核' && isAdmin && <Button type="link" size="small" onClick={() => { updateStatus(row, '审核中'); navigate(`/app/project-application/audit/${row.id}`); }}>审核</Button>}
          {row.status === '审核中' && isAdmin && <Button type="link" size="small" onClick={() => navigate(`/app/project-application/audit/${row.id}`)}>审核</Button>}
          {row.status === '待审核' && !isAdmin && <Button type="link" danger size="small" onClick={() => updateStatus(row, '撤销修改')}>撤销</Button>}
        </Space>;
      },
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
  const { pushWelcomeGreeting, consumeWelcome, addMessage } = useSmartDraft();
  const [submitting, setSubmitting] = useState(false);

  const initialValues: Partial<ProjectFormValues> = editing ? {
    ...editing,
    assessmentIndicators: editing.assessmentIndicators || {
      ...emptyAssessmentIndicators(),
      technical: [{ content: editing.indicators || '' }],
    },
    applicationFiles: editing.files.slice(0, 1).map((name, i) => ({ uid: `${i}`, name, status: 'done' })),
    evidenceFiles: editing.files.slice(1).map((name, i) => ({ uid: `e${i}`, name, status: 'done' })),
  } : {
    track: '助医赛道',
    supports: [],
    technologies: [],
    models: [],
    assessmentIndicators: emptyAssessmentIndicators(),
    totalBudget: 0,
  };
  const normFile = (e: { fileList?: UploadFile[] } | UploadFile[]) => Array.isArray(e) ? e : e?.fileList;
  const beforeUpload = (file: File) => {
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) { message.error('上传失败，仅支持PDF、DOC、DOCX类型文件'); return Upload.LIST_IGNORE; }
    if (file.size / 1024 / 1024 > 30) { message.error('上传失败，单文件超过最大限制30M'); return Upload.LIST_IGNORE; }
    applyAssistantInput(file.name, 'file');
    message.success('上传成功，医小管已识别并填充可提取的信息'); return false;
  };

  const applyAssistantInput = (input: string, source: 'text' | 'file' = 'text') => {
    const current = form.getFieldsValue(true);
    const cleanName = input.replace(/\.(pdf|docx?)$/i, '').replace(/项目申报书/g, '').trim();
    const projectName = input.match(/(?:项目名称[：:]?|申报)([^，。；\n]{4,40})/)?.[1]?.trim()
      || (source === 'file' && cleanName.length >= 4 ? cleanName : undefined);
    const department = departmentOptions.find((option) => input.includes(String(option.label)))?.value;
    const track = tracks.find((item) => input.includes(item));
    const phone = input.match(/1[3-9]\d{9}/)?.[0];
    const budget = input.match(/(?:预算|经费)[^\d]{0,6}(\d+(?:\.\d+)?)\s*万/)?.[1];
    const leader = input.match(/(?:项目负责人|负责人)[：:]?\s*([\u4e00-\u9fa5]{2,10})/)?.[1];
    const contact = input.match(/(?:项目联系人|联系人)[：:]?\s*([\u4e00-\u9fa5]{2,10})/)?.[1];
    const superiorDepartment = ['数智发展处', '科研处', '临床研究中心', '医务处']
      .find((item) => input.includes(item));
    const next: Partial<ProjectFormValues> = {
      ...(!current.name && projectName ? { name: projectName } : {}),
      ...(!current.department && department ? { department: String(department) } : {}),
      ...(!current.superiorDepartment && superiorDepartment ? { superiorDepartment } : {}),
      ...(!current.track && track ? { track } : {}),
      ...(!current.leader && leader ? { leader } : {}),
      ...(!current.contact && contact ? { contact } : {}),
      ...(!current.phone && phone ? { phone } : {}),
      ...(!current.totalBudget && budget ? { totalBudget: Number(budget) } : {}),
      ...(!current.overview && source === 'text' && input.length > 8 ? { overview: input } : {}),
      ...(source === 'file' && !current.applicationFiles?.length ? {
        applicationFiles: [{
          uid: `assistant-${Date.now()}`,
          name: input,
          status: 'done',
        }],
      } : {}),
    };
    if (Object.keys(next).length) {
      form.setFieldsValue(next);
      addMessage({
        role: 'agent',
        type: 'text',
        content: `已识别并填充 ${Object.keys(next).length} 个字段。缺失字段可继续在表单中填写，或通过文字、语音、文件补充。`,
      });
    } else {
      addMessage({ role: 'agent', type: 'text', content: '已收到补充信息。暂未识别出新的字段，请说明项目名称、申报科室、联系人、电话、预算或项目概述等信息。' });
    }
  };

  useEffect(() => {
    pushWelcomeGreeting(
      'project-application-form',
      currentUser?.roles.includes('信息科管理员') ? 'admin' : 'dept',
      undefined,
      {
        actions: [
          {
            key: 'project-application-upload',
            label: '上传文件',
            event: 'agent-register-trigger-upload',
            enabled: true,
          },
          {
            key: 'project-application-voice',
            label: '语音描述',
            event: 'agent-register-trigger-voice',
            enabled: true,
          },
        ],
      },
    );
    const onInput = (event: Event) => {
      const detail = (event as CustomEvent<{ text?: string; source?: 'text' | 'file' }>).detail;
      if (detail?.text) applyAssistantInput(detail.text, detail.source);
    };
    window.addEventListener('project-application-assistant-input', onInput);
    return () => {
      window.removeEventListener('project-application-assistant-input', onInput);
      consumeWelcome();
    };
  }, [consumeWelcome, currentUser?.roles, pushWelcomeGreeting]);
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
        indicators: indicatorsToText(values.assessmentIndicators),
        assessmentIndicators: values.assessmentIndicators,
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
                <Upload.Dragger accept=".pdf,.doc,.docx" beforeUpload={beforeUpload} maxCount={1} className="project-upload-compact">
                  <p className="ant-upload-drag-icon"><FilePdfOutlined /></p>
                  <p className="ant-upload-text">点击或拖拽项目申报书</p>
                  <p className="ant-upload-hint">支持 PDF、DOC、DOCX · 必填 · 单文件 ≤ 30M · 限 1 份</p>
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
              <Col xs={24} lg={12}><Form.Item label="申报赛道" name="track" rules={[required]}><Radio.Group className="project-option-buttons" options={tracks} optionType="button" buttonStyle="solid" /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item label="申报科室" name="department" rules={[required]}><Select showSearch options={departmentOptions} placeholder="请选择申报科室" /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item label="上级部门" name="superiorDepartment" rules={[required]}><Select options={['数智发展处', '科研处', '临床研究中心', '医务处'].map((v) => ({ label: v, value: v }))} placeholder="请选择上级部门" /></Form.Item></Col>
              <Col xs={24} sm={8}><Form.Item label="项目负责人" name="leader" rules={[required, { min: 2, max: 10 }]}><Input showCount maxLength={10} placeholder="请输入姓名" /></Form.Item></Col>
              <Col xs={24} sm={8}><Form.Item label="项目联系人" name="contact" rules={[required, { min: 2, max: 10 }]}><Input showCount maxLength={10} placeholder="请输入姓名" /></Form.Item></Col>
              <Col xs={24} sm={8}><Form.Item label="联系方式" name="phone" rules={[required, { pattern: /^1\d{10}$/, message: '请输入正确的11位手机号' }]}><Input maxLength={11} placeholder="11 位手机号" /></Form.Item></Col>
              <Col span={24}><Form.Item label="希望获得的支持" name="supports" rules={[required]}><Select mode="multiple" allowClear showSearch options={supportOptions.map((value) => ({ label: value, value }))} placeholder="请选择希望获得的支持（可多选）" /></Form.Item></Col>
            </Row>
          </Card>

          <Card id="content" title="③ 项目内容信息" style={{ marginBottom: 16 }}>
            <Row gutter={[16, 0]}>
              <Col span={24}><Form.Item label="项目概述" name="overview" rules={[required]}><TextArea rows={4} showCount maxLength={300} placeholder="说明立项背景、项目目标、技术方案与预期成效" /></Form.Item></Col>
              <Col span={24}><Form.Item label="项目解决的痛点" name="painPoints" rules={[required]}><TextArea rows={4} showCount maxLength={200} placeholder="描述项目拟解决的效率、成本、质量或流程问题" /></Form.Item></Col>
              <Col xs={24} lg={12}><Form.Item label="项目运用的核心技术" name="technologies" rules={[required]}><Select mode="multiple" allowClear showSearch maxTagCount="responsive" options={technologyOptions.map((value) => ({ label: value, value }))} placeholder="请选择核心技术（可多选）" /></Form.Item></Col>
              <Col xs={24} lg={12}><Form.Item label="项目运用的大模型" name="models" rules={[required]}><Select mode="multiple" allowClear showSearch maxTagCount="responsive" options={modelOptions.map((value) => ({ label: value, value }))} placeholder="请选择大模型（可多选）" /></Form.Item></Col>
              <Col span={24}><Form.Item label="项目完成形式" name="deliverables" rules={[required]}><TextArea rows={4} placeholder="说明智能体、知识库、模型训练等具体产出物" /></Form.Item></Col>
              <Col span={24}>
                <div className="project-indicators">
                  <div className="project-indicators-title"><span className="project-required-mark">*</span>考核指标</div>
                  <div className="project-indicators-hint">请按以下 4 个维度填写，每个维度支持添加多条指标</div>
                  <Row gutter={[16, 16]}>
                    {indicatorDimensions.map((dimension) => (
                      <Col xs={24} xl={12} key={dimension.key}>
                        <div className="project-indicator-dimension">
                          <div className="project-indicator-dimension-title">{dimension.title}</div>
                          <Form.List name={['assessmentIndicators', dimension.key]}>
                            {(fields, { add, remove }) => (
                              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                {fields.map((field, index) => (
                                  <div className="project-indicator-row" key={field.key}>
                                    <Form.Item
                                      {...field}
                                      name={[field.name, 'content']}
                                      rules={[{ required: true, whitespace: true, message: `请填写${dimension.title}指标` }]}
                                      style={{ flex: 1, marginBottom: 0 }}
                                    >
                                      <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} placeholder={dimension.placeholder} />
                                    </Form.Item>
                                    <Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除${dimension.title}指标`} disabled={fields.length === 1} onClick={() => remove(field.name)} />
                                  </div>
                                ))}
                                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ content: '' })}>添加{dimension.title}指标</Button>
                              </Space>
                            )}
                          </Form.List>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              </Col>
            </Row>
          </Card>

          <Card id="budget" title="④ 项目经费预算" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col xs={24} sm={12} lg={8}><Form.Item label="已有经费来源合计" name="totalBudget" rules={[required]}><InputNumber min={0} precision={2} addonAfter="万元" style={{ width: '100%' }} /></Form.Item></Col>
              <Col span={24}><Form.Item label="具体来源明细" name="fundingDetail" rules={[required]}><TextArea rows={3} placeholder="例如：医院资助 20 万元；其他渠道资助 10 万元" /></Form.Item></Col>
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
      <Space direction="vertical">{record.files.map((file) => <Space key={file}><FilePdfOutlined style={{ color: '#ff4d4f' }} /><Button type="link" onClick={() => message.info(`正在预览：${file}`)}>{file}</Button><Button type="link" icon={<DownloadOutlined />} onClick={() => void downloadApplication(record, file)}>下载</Button></Space>)}</Space>
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
      <Descriptions.Item label="项目完成形式">{record.deliverables}</Descriptions.Item>
      <Descriptions.Item label="考核指标">
        {record.assessmentIndicators ? (
          <Space direction="vertical" size={8}>
            {indicatorDimensions.map(({ key, title }) => (
              <div key={key}>
                <Text strong>{title}：</Text>
                {record.assessmentIndicators?.[key].map((item, index) => (
                  <div key={`${key}-${index}`}>{index + 1}. {item.content}</div>
                ))}
              </div>
            ))}
          </Space>
        ) : record.indicators}
      </Descriptions.Item>
    </Descriptions></Card>
    <Card title="项目经费预算" bordered={false}><Descriptions column={1} labelStyle={{ width: 170, color: '#8c8c8c' }}>
      <Descriptions.Item label="已有经费来源合计">{record.totalBudget} 万元</Descriptions.Item><Descriptions.Item label="具体来源明细">{record.fundingDetail}</Descriptions.Item><Descriptions.Item label="具体使用明细">{record.spendingDetail}</Descriptions.Item>
    </Descriptions></Card>
  </Space>;
}

export function ProjectApplicationDetail() {
  const { id } = useParams(); const navigate = useNavigate();
  const record = useMemo(() => getRecord(id), [id]);
  const { currentUser } = useAuth();
  const { pushWelcomeGreeting, consumeWelcome } = useSmartDraft();
  const isAdmin = currentUser?.roles.includes('信息科管理员') ?? false;
  useEffect(() => {
    if (!record) return undefined;
    const onDownload = () => {
      void downloadApplication(record, record.files[0])
        .then(() => message.success('项目申报书已开始下载'))
        .catch(() => message.error('项目申报书下载失败，请稍后重试'));
    };
    window.addEventListener('project-application-download', onDownload);
    pushWelcomeGreeting(
      'project-application-detail',
      isAdmin ? 'admin' : 'dept',
      () => [record.name],
      {
        actions: [{
          key: 'download-project-application',
          label: '项目申报书下载',
          event: 'project-application-download',
          enabled: record.files.length > 0,
          reason: '当前项目暂无可下载的申报书',
        }],
      },
    );
    return () => {
      window.removeEventListener('project-application-download', onDownload);
      consumeWelcome();
    };
  }, [consumeWelcome, isAdmin, pushWelcomeGreeting, record]);
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
  const aiPreAudit = useMemo(() => {
    if (!record) {
      return { conclusion: '立项通过' as const, note: '' };
    }
    return {
      conclusion: '立项通过' as const,
      note: `经AI预审，项目申报信息填写完整，建设目标与${record.track}定位相符；项目痛点、技术方案及交付成果描述清晰，${record.totalBudget}万元经费来源与使用明细基本匹配。建议立项通过，后续重点关注院内系统接口联调、数据安全合规及考核指标落实。`,
    };
  }, [record]);
  const [conclusion, setConclusion] = useState<'立项通过' | '立项不通过'>(aiPreAudit.conclusion);
  const [note, setNote] = useState(record?.reviewNote || aiPreAudit.note);
  const { pushWelcomeGreeting, consumeWelcome } = useSmartDraft();

  useEffect(() => {
    if (!record) return undefined;
    const completeFromAssistant = (nextConclusion: '立项通过' | '立项不通过') => {
      saveRecord({
        ...record,
        status: nextConclusion,
        reviewNote: note,
        finishTime: now(),
        updateTime: now(),
      });
      message.success(`审核完成：${nextConclusion}`);
      navigate(`/app/project-application?status=${nextConclusion}`);
    };
    const onPass = () => completeFromAssistant('立项通过');
    const onReject = () => completeFromAssistant('立项不通过');
    window.addEventListener('project-application-audit-pass', onPass);
    window.addEventListener('project-application-audit-reject', onReject);
    pushWelcomeGreeting(
      'project-application-audit',
      'admin',
      () => [0, aiPreAudit.conclusion],
      {
        actions: [
          {
            key: 'project-application-audit-pass',
            label: '立项通过',
            event: 'project-application-audit-pass',
            enabled: true,
          },
          {
            key: 'project-application-audit-reject',
            label: '立项不通过',
            event: 'project-application-audit-reject',
            enabled: true,
          },
        ],
      },
    );
    return () => {
      window.removeEventListener('project-application-audit-pass', onPass);
      window.removeEventListener('project-application-audit-reject', onReject);
      consumeWelcome();
    };
  }, [aiPreAudit.conclusion, consumeWelcome, id, navigate, pushWelcomeGreeting]);

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
      <Form layout="vertical" className="project-audit-form">
        <div className="project-ai-preaudit-field" data-ai-prefilled="true">
          <Form.Item
            label={<span>审核结论<Tag color="green" icon={<ThunderboltFilled />} className="project-ai-preaudit-tag">AI 预审</Tag></span>}
            required
          >
            <Radio.Group value={conclusion} onChange={(e) => setConclusion(e.target.value)}>
              <Radio value="立项通过">立项通过</Radio>
              <Radio value="立项不通过">立项不通过</Radio>
            </Radio.Group>
          </Form.Item>
        </div>
        <Divider />
        <div className="project-ai-preaudit-field" data-ai-prefilled="true">
          <Form.Item
            label={<span>具体说明<Tag color="green" icon={<ThunderboltFilled />} className="project-ai-preaudit-tag">AI 预审</Tag></span>}
            extra={`${note.length}/500`}
          >
            <TextArea
              className="project-ai-preaudit-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={5}
              placeholder={conclusion === '立项通过' ? '请填写通过意见或后续工作要求' : '请填写不通过原因及修改建议'}
            />
          </Form.Item>
        </div>
      </Form>
    </Card>
    <Card bordered={false} style={{ textAlign: 'right' }}><Space><Button onClick={() => navigate(-1)}>取消</Button><Button type={conclusion === '立项通过' ? 'primary' : 'default'} danger={conclusion === '立项不通过'} onClick={submitAudit}>{conclusion}</Button></Space></Card>
  </Space>;
}
