/**
 * 智能体建设需求管理 - 生成需求页（1.2）
 *
 * 新建（/create）与编辑草稿（/edit/:id）共用。
 * 结构化需求表单，按字段说明手动输入/选择，实时校验字数与格式。
 *   - 暂存：不做必填校验，落入草稿页（1.3），提示「已暂存到草稿」
 *   - 提交：二次确认 → 全量校验（手机号 / 字数）→ 通过后跳转需求管理页（1.1）
 *           校验失败定位首个错误字段
 *   - 可选：提交前点【智能化匹配】预览 TOP3
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { departmentOptions } from '../../mock/departments';
import PageHeader from '../../components/PageHeader';
import {
  ROLE_DEPT,
  clinicalStageValues,
  resourceOptions,
  urgencyOptions,
  matchAgents,
  buildMatchResult,
  type BuildNeed,
  type ClinicalStage,
  type MatchItem,
  type ResourceType,
  type UrgencyLevel,
} from './types';
import { getNeed, upsertNeed, patchNeed, nowStr, genNeedId, nextSerialNo } from './store';

const { TextArea } = Input;
const { Text } = Typography;

interface FormValues {
  title?: string;
  department?: string;
  reason?: string;
  proposer?: string;
  contactPhone?: string;
  clinicalStage?: ClinicalStage;
  clinicalStageOther?: string;
  functionDesc?: string;
  resources?: ResourceType[];
  urgency?: UrgencyLevel;
}

const NeedForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentUser } = useAuth();
  const loginName = currentUser?.name || '当前用户';
  const [form] = Form.useForm<FormValues>();

  const editing = getNeed(id || '');
  const isEdit = !!editing;
  // 编辑「已提交」需求：保存后仍回写为已提交并跳回详情页，不降级为草稿
  const isSubmittedEdit = editing?.status === '已提交';

  // 匹配预览
  const [previewTop, setPreviewTop] = useState<MatchItem[] | null>(null);
  // 提交二次确认
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 监听诊疗环节，控制「其他」填空框显隐
  const stage = Form.useWatch('clinicalStage', form);

  useEffect(() => {
    if (editing) {
      form.setFieldsValue({
        title: editing.title,
        department: editing.department,
        reason: editing.reason,
        proposer: editing.proposer,
        contactPhone: editing.contactPhone,
        clinicalStage: editing.clinicalStage,
        clinicalStageOther: editing.clinicalStageOther,
        functionDesc: editing.functionDesc,
        resources: editing.resources,
        urgency: editing.urgency,
      });
    } else {
      // 新建默认：提出人预填当前登录人
      form.setFieldsValue({ proposer: loginName, urgency: '中', resources: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const buildRecord = (values: FormValues, status: BuildNeed['status']): BuildNeed => {
    const now = nowStr(0);
    const baseId = isEdit ? editing!.id : genNeedId();
    const serialNo = isEdit ? editing!.serialNo : nextSerialNo();
    return {
      id: baseId,
      serialNo,
      title: (values.title || '').trim(),
      department: values.department || '',
      reason: values.reason || '',
      proposer: (values.proposer || '').trim(),
      contactPhone: (values.contactPhone || '').trim(),
      clinicalStage: values.clinicalStage || '其他',
      clinicalStageOther: values.clinicalStage === '其他' ? values.clinicalStageOther : undefined,
      functionDesc: values.functionDesc || '',
      resources: values.resources || [],
      urgency: values.urgency || '中',
      matchResult: isEdit ? editing!.matchResult : undefined,
      status,
      applicant: isEdit ? editing!.applicant : loginName,
      submitTime: status === '已提交' ? now : isEdit ? editing!.submitTime : undefined,
      lastUpdateTime: now,
    };
  };

  // 暂存：不做必填校验（仅草稿态需求可用）
  const handleSave = () => {
    const values = form.getFieldsValue();
    const rec = buildRecord(values, '草稿');
    upsertNeed(rec);
    message.success('已暂存到草稿');
    navigate('/app/agent-needs?tab=draft');
  };

  // 提交 / 保存修改：二次确认 → 全量校验
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const rec = buildRecord(values, '已提交');
      upsertNeed(rec);
      setConfirmOpen(false);
      if (isSubmittedEdit) {
        message.success('需求信息已更新');
        navigate(`/app/agent-needs/detail/${editing!.id}`);
      } else {
        message.success('需求已提交');
        navigate('/app/agent-needs');
      }
    } catch (err: any) {
      setConfirmOpen(false);
      // 定位首个错误字段
      const first = err?.errorFields?.[0]?.name;
      if (first) form.scrollToField(first, { behavior: 'smooth', block: 'center' });
      message.error('请完善表单必填项与格式后再提交');
    }
  };

  // 智能化匹配预览（不落库）
  const handlePreviewMatch = async () => {
    try {
      const values = await form.validateFields(['clinicalStage', 'functionDesc']);
      const top = matchAgents({
        clinicalStage: values.clinicalStage!,
        functionDesc: values.functionDesc || form.getFieldValue('functionDesc') || '',
        resources: form.getFieldValue('resources') || [],
        department: form.getFieldValue('department') || '',
      });
      setPreviewTop(top);
      // 编辑态可顺带把预览结果落库
      if (isEdit) {
        patchNeed(editing!.id, { matchResult: top.length ? buildMatchResult(top, nowStr(0)) : undefined });
      }
      if (!top.length) message.info('暂无匹配智能体');
    } catch {
      message.warning('请先选择诊疗环节并填写功能描述');
    }
  };

  // 手机号失焦校验
  const phoneValidator = (_: unknown, value: string) => {
    if (!value) return Promise.reject(new Error('请输入联系方式'));
    if (!/^1[3-9]\d{9}$/.test(value)) return Promise.reject(new Error('请输入正确的 11 位手机号'));
    return Promise.resolve();
  };

  const clinicalStageOptions = useMemo(
    () => clinicalStageValues.map((s) => ({ label: s, value: s })),
    [],
  );

  return (
    <div style={{ padding: 0 }}>
      <PageHeader
        title={isSubmittedEdit ? '编辑需求' : isEdit ? '编辑需求草稿' : '生成需求'}
        subTitle={
          isSubmittedEdit
            ? '修改已提交需求信息，保存后仍保留在需求管理列表'
            : '按字段说明手动填写建设需求，可暂存为草稿或直接提交'
        }
        showBack
        onBack={() => navigate(-1)}
      />

      <Card style={{ marginTop: 12 }}>
        <Form
          form={form}
          layout="vertical"
          requiredMark
          style={{ maxWidth: 860 }}
          initialValues={{ resources: [], urgency: '中' }}
        >
          <Form.Item
            label="需求标题"
            name="title"
            rules={[
              { required: true, message: '请输入需求标题' },
              { max: 30, message: '需求标题不超过 30 字' },
            ]}
            extra="一句话概括需求，≤30 字，如「门诊智能预问诊助手」，避免与已有需求重复"
          >
            <Input placeholder="请输入需求标题" maxLength={30} showCount />
          </Form.Item>

          <Form.Item label="提出科室" name="department" rules={[{ required: true, message: '请选择提出科室' }]}>
            <Select placeholder="请选择提出科室" options={departmentOptions} showSearch style={{ maxWidth: 320 }} />
          </Form.Item>

          <Form.Item
            label="提出原因"
            name="reason"
            rules={[
              { required: true, message: '请输入提出原因' },
              { min: 50, message: '提出原因不少于 50 字' },
              { max: 300, message: '提出原因不超过 300 字' },
            ]}
            extra="简述业务背景与痛点，说明「为什么要建」，50-300 字"
          >
            <TextArea placeholder="请输入提出原因（50-300 字）" autoSize={{ minRows: 3, maxRows: 6 }} maxLength={300} showCount />
          </Form.Item>

          <Form.Item
            label="提出人"
            name="proposer"
            rules={[
              { required: true, message: '请输入提出人' },
              { min: 2, max: 10, message: '提出人限 2-10 个字' },
            ]}
          >
            <Input placeholder="请输入提出人" maxLength={10} showCount style={{ maxWidth: 320 }} />
          </Form.Item>

          <Form.Item
            label="联系方式"
            name="contactPhone"
            validateTrigger={['onBlur']}
            rules={[{ required: true, validator: phoneValidator }]}
            extra="11 位手机号"
          >
            <Input placeholder="请输入 11 位手机号" maxLength={11} style={{ maxWidth: 320 }} />
          </Form.Item>

          <Form.Item label="诊疗环节" name="clinicalStage" rules={[{ required: true, message: '请选择诊疗环节' }]}>
            <Radio.Group>
              <Space wrap>
                {clinicalStageOptions.map((o) => (
                  <Radio key={o.value} value={o.value}>
                    {o.label}
                  </Radio>
                ))}
              </Space>
            </Radio.Group>
          </Form.Item>

          {stage === '其他' && (
            <Form.Item
              label="诊疗环节（其他）"
              name="clinicalStageOther"
              rules={[
                { required: true, message: '请填写诊疗环节' },
                { max: 20, message: '不超过 20 字' },
              ]}
            >
              <Input placeholder="请填写具体诊疗环节" maxLength={20} showCount style={{ maxWidth: 320 }} />
            </Form.Item>
          )}

          <Form.Item
            label="功能描述"
            name="functionDesc"
            rules={[
              { required: true, message: '请输入功能描述' },
              { max: 500, message: '功能描述不超过 500 字' },
            ]}
            extra="重点说明智能体工作内容、服务对象、输入信息、输出结果；≤500 字"
          >
            <TextArea
              placeholder="参考示例：面向门诊患者开展预问诊服务，自动采集主诉、现病史、既往史等信息，形成标准化问诊摘要"
              autoSize={{ minRows: 5, maxRows: 10 }}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item label="所需资源" name="resources" extra="可多选：业务系统、模型">
            <Checkbox.Group options={resourceOptions} />
          </Form.Item>

          <Form.Item label="需求紧急程度" name="urgency" rules={[{ required: true, message: '请选择需求紧急程度' }]} extra="提出人建议值，最终由 IT 管理员核定">
            <Radio.Group options={urgencyOptions} optionType="button" buttonStyle="solid" />
          </Form.Item>

          {/* 匹配预览 */}
          <Form.Item label="智能化匹配（可选预览）">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button icon={<ThunderboltOutlined />} onClick={handlePreviewMatch}>
                预览 TOP3 匹配智能体
              </Button>
              {previewTop && (
                previewTop.length > 0 ? (
                  <Table
                    rowKey="agentId"
                    size="small"
                    pagination={false}
                    style={{ maxWidth: 560 }}
                    dataSource={previewTop}
                    columns={[
                      { title: '排名', key: 'rank', width: 56, render: (_v, _r, i) => i + 1 },
                      { title: '智能体编号', dataIndex: 'agentCode', key: 'agentCode', width: 120 },
                      { title: '智能体名称', dataIndex: 'agentName', key: 'agentName' },
                      { title: '匹配度', dataIndex: 'score', key: 'score', width: 84, render: (s: number) => <Tag color="blue">{s}%</Tag> },
                    ]}
                  />
                ) : (
                  <Text type="secondary">暂无匹配智能体</Text>
                )
              )}
            </Space>
          </Form.Item>

          <Form.Item>
            <Space>
              {/* 已提交需求编辑态不提供「暂存为草稿」，避免把线上需求降级为草稿 */}
              {!isSubmittedEdit && <Button onClick={handleSave}>暂存</Button>}
              <Button type="primary" onClick={() => setConfirmOpen(true)}>
                {isSubmittedEdit ? '保存修改' : '提交'}
              </Button>
              <Button type="text" onClick={() => navigate(-1)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Modal
        open={confirmOpen}
        title={isSubmittedEdit ? '确认保存修改' : '确认是否提交'}
        onCancel={() => setConfirmOpen(false)}
        onOk={handleSubmit}
        okText={isSubmittedEdit ? '确认保存' : '确认提交'}
        cancelText="取消"
      >
        <Text>
          {isSubmittedEdit
            ? '保存后将更新该需求信息并返回详情页。请确认所填信息无误。'
            : '提交后将进入需求管理列表，并可执行智能化匹配。请确认所填信息无误。'}
        </Text>
      </Modal>

      <span style={{ display: 'none' }} aria-hidden>{ROLE_DEPT}</span>
    </div>
  );
};

export default NeedForm;
