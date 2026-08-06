import { useEffect, useMemo } from 'react';
import dayjs from 'dayjs';
import {
  CheckCircleOutlined,
  CloseOutlined,
  CopyOutlined,
  ExportOutlined,
  InfoCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import { PUJIANG_PLATFORM, PUJIANG_PLATFORM_URL, getPujiangTask, initialPujiangTasks } from './data';
import { useSmartDraft } from '../../agent-center/smart/store';

const { Link, Text } = Typography;
const { TextArea } = Input;

const API_EXAMPLE = `base_url = "https://api.example.com/v1/"
path = "model-id"
question = "你好"

client = OpenAI(api_key=api_key, base_url=base_url)
completion = client.chat.completions.create(
    model=path,
    messages=[{'role': 'user', 'content': question}]
)
print(completion.choices[0].message.content)`;

const PujiangTaskForm = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { pushWelcomeGreeting, consumeWelcome } = useSmartDraft();
  const editingTask = useMemo(() => params.get('taskId') ? getPujiangTask(params.get('taskId')!) : undefined, [params]);
  const [form] = Form.useForm();
  const back = (notice?: string) => { if (notice) message.success(notice); navigate('/app/evaluation/tasks?module=pujiang'); };

  const counts = useMemo(() => ({
    evaluating: initialPujiangTasks.filter((task) => task.status === '评测中').length,
    passed: initialPujiangTasks.filter((task) => task.status === '评测通过').length,
    returned: initialPujiangTasks.filter((task) => task.status === '退回修改').length,
  }), []);

  useEffect(() => {
    const values = [counts.evaluating, counts.passed, counts.returned];
    pushWelcomeGreeting('pujiang-evaluation-create', 'admin', () => values, {
      windowReplacements: values,
      chips: [
        { key: 'pujiang-create-evaluating', label: `评测中 ${counts.evaluating}`, targetTab: '评测中', tone: 'warning' },
        { key: 'pujiang-create-passed', label: `评测通过 ${counts.passed}`, targetTab: '评测通过', tone: 'success' },
        { key: 'pujiang-create-returned', label: `退回修改 ${counts.returned}`, targetTab: '退回修改', tone: 'error' },
      ],
    });
    const onJump = (event: Event) => {
      const targetTab = (event as CustomEvent<string>).detail;
      if (!['评测中', '评测通过', '退回修改'].includes(targetTab)) return;
      navigate(`/app/evaluation/tasks?module=pujiang&tab=${encodeURIComponent(targetTab)}`);
    };
    window.addEventListener('agent-jump-tab', onJump);
    return () => {
      window.removeEventListener('agent-jump-tab', onJump);
      consumeWelcome();
    };
  }, [consumeWelcome, counts, navigate, pushWelcomeGreeting]);

  const fillAgentFields = (agentId: string) => {
    const agent = initialPujiangTasks.find((item) => item.id === agentId);
    if (!agent) return;
    form.setFieldsValue({
      modelName: agent.agentName.slice(0, 20),
      modelId: agent.agentCode,
      apiEndpoint: `https://api.hospital.example.com/agents/${agent.agentCode.toLowerCase()}/v1`,
      apiDocument: `https://docs.hospital.example.com/agents/${agent.agentCode.toLowerCase()}`,
    });
  };

  const handlePublicChange = (value: '公开' | '不公开') => {
    if (value !== '公开') return;
    Modal.confirm({
      title: '确认公开评测结果',
      content: '公开后，评测结果将在浦江实验室评测平台榜单对外展示。确认公开吗？',
      okText: '确认公开',
      cancelText: '不公开',
      onCancel: () => form.setFieldValue('resultPublic', '不公开'),
    });
  };

  return <div style={{ padding: 24, background: '#F5F5F5', minHeight: '100%' }}>
    <PageHeader title={editingTask ? '编辑浦江评测任务' : '新建浦江评测任务'} subTitle="填写参评智能体与 API 提交信息，发起浦江实验室评测" showBack onBack={() => back('已自动保存为草稿')} />
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        agentId: editingTask?.id || initialPujiangTasks[0].id,
        modelName: (editingTask || initialPujiangTasks[0]).agentName.slice(0, 20),
        developerType: '组织团队',
        parameterCount: 7,
        openSource: '否',
        contextLength: 32,
        apiEndpoint: `https://api.hospital.example.com/agents/${(editingTask || initialPujiangTasks[0]).agentCode.toLowerCase()}/v1`,
        temperature: 0.7,
        topP: 0.9,
        modelId: (editingTask || initialPujiangTasks[0]).agentCode,
        apiKey: 'sk-medbench-demo-key',
        apiDocument: `https://docs.hospital.example.com/agents/${(editingTask || initialPujiangTasks[0]).agentCode.toLowerCase()}`,
        concurrency: 32,
        releaseDate: dayjs('2026-07-01'),
        email: 'admin@hospital.example.com',
        resultPublic: '不公开',
      }}
    >
      <Card title="评测对象" style={{ marginTop: 16 }}>
        <Form.Item label="选择智能体" name="agentId" rules={[{ required: true, message: '请选择智能体' }]}>
          <Select style={{ maxWidth: 520 }} showSearch optionFilterProp="label" onChange={fillAgentFields} options={initialPujiangTasks.map((task) => ({ value: task.id, label: `${task.agentName}（${task.agentCode}）` }))} />
        </Form.Item>
        <Form.Item label="评测平台">
          <Space direction="vertical" size={4}>
            <Text strong>{PUJIANG_PLATFORM}</Text>
            <Link href={PUJIANG_PLATFORM_URL} target="_blank" rel="noreferrer"><ExportOutlined /> {PUJIANG_PLATFORM_URL}</Link>
          </Space>
        </Form.Item>
      </Card>

      <Card title="API提交信息" style={{ marginTop: 16 }}>
        <Form.Item label="智能体名称" name="modelName" rules={[{ required: true, message: '请输入智能体名称' }, { max: 20, message: '智能体名称不能超过 20 个字符' }]}>
          <Input showCount maxLength={20} placeholder="请输入智能体名称" />
        </Form.Item>
        <Form.Item label={<Space>开发者类型<Tooltip title="个人指自然人开发者；组织/团队指医院、企业、高校或研发团队"><InfoCircleOutlined /></Tooltip></Space>} name="developerType" rules={[{ required: true, message: '请选择开发者类型' }]}>
          <Radio.Group options={['个人', '组织团队']} />
        </Form.Item>
        <Form.Item label="参数量（单位：十亿）" name="parameterCount" rules={[{ required: true, message: '请输入参数量' }]}>
          <InputNumber min={0.1} step={0.1} precision={1} addonAfter="B" placeholder="请输入参数量" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="是否开源" name="openSource" rules={[{ required: true, message: '请选择是否开源' }]}>
          <Radio.Group options={['是', '否']} />
        </Form.Item>
        <Form.Item label="上下文长度（单位：token）" name="contextLength" rules={[{ required: true, message: '请输入上下文长度' }]}>
          <InputNumber min={1} precision={0} addonAfter="K" placeholder="请输入智能体可支持的上下文长度" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="智能体 API Endpoint" name="apiEndpoint" rules={[{ required: true, message: '请输入智能体 API Endpoint' }, { type: 'url', message: '请输入合法的 URL' }]}>
          <Input placeholder="请输入 API Endpoint URL" />
        </Form.Item>
        <Form.Item label="Temperature" name="temperature" rules={[{ required: true, message: '请输入 Temperature' }, { type: 'number', min: 0, max: 2, message: 'Temperature 须在 0–2 之间' }]}>
          <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} placeholder="请输入 Temperature" />
        </Form.Item>
        <Form.Item label="Top P" name="topP" rules={[{ type: 'number', min: 0, max: 1, message: 'Top P 须在 0–1 之间' }]}>
          <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} placeholder="请输入 Top P" />
        </Form.Item>
        <Form.Item label="智能体 ID" name="modelId" rules={[{ required: true, message: '请输入智能体 ID' }]}>
          <Input placeholder="请输入智能体 ID" />
        </Form.Item>
        <Form.Item label="API Key" name="apiKey">
          <Input.Password placeholder="请输入 API Key" autoComplete="new-password" />
        </Form.Item>
        <Form.Item label="智能体 API 文档" name="apiDocument" rules={[{ required: true, message: '请输入智能体 API 文档' }, { max: 1024, message: '智能体 API 文档不能超过 1024 个字符' }]}>
          <TextArea showCount maxLength={1024} autoSize={{ minRows: 3, maxRows: 6 }} placeholder="请输入智能体 API 文档链接或调用说明" />
        </Form.Item>
        <div style={{ position: 'relative', padding: '16px 48px 16px 16px', margin: '-8px 0 24px', background: '#F7F8FA', borderRadius: 6, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13 }}>
          {API_EXAMPLE}
          <Button type="text" icon={<CopyOutlined />} aria-label="复制示例代码" onClick={() => { void navigator.clipboard?.writeText(API_EXAMPLE); message.success('示例代码已复制'); }} style={{ position: 'absolute', right: 8, top: 8 }} />
        </div>
        <Form.Item label="预计 API 并发量" name="concurrency" rules={[{ type: 'number', min: 1, message: '预计 API 并发量须为正整数' }]}>
          <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="比如：32" />
        </Form.Item>
        <Form.Item label="GitHub / 官网" name="website" rules={[{ type: 'url', message: '请输入合法的链接' }]}>
          <Input placeholder="请输入可访问的链接" />
        </Form.Item>
        <Form.Item label="智能体发布日期" name="releaseDate" rules={[{ required: true, message: '请选择智能体发布日期' }]}>
          <DatePicker format="YYYY-MM-DD" disabledDate={(date) => date.isAfter(dayjs(), 'day')} placeholder="请选择日期" style={{ width: 320 }} />
        </Form.Item>
        <Form.Item label="邮箱" name="email" rules={[{ required: true, message: '请输入邮箱地址' }, { type: 'email', message: '请输入合法的邮箱地址' }]}>
          <Input placeholder="请输入邮箱地址" />
        </Form.Item>
        <Form.Item label={<Space>评测结果是否公开<Tooltip title="公开后将在评测平台榜单展示；医疗场景建议选择不公开"><InfoCircleOutlined /></Tooltip></Space>} name="resultPublic" rules={[{ required: true, message: '请选择评测结果是否公开' }]}>
          <Radio.Group onChange={(event) => handlePublicChange(event.target.value)} options={['公开', '不公开']} />
        </Form.Item>
      </Card>
    </Form>

    <Card style={{ marginTop: 16 }} bodyStyle={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Space>
        <Button icon={<CloseOutlined />} onClick={() => back()}>取消</Button>
        <Button icon={<SaveOutlined />} onClick={() => back('已暂存为草稿')}>暂存</Button>
        <Button type="primary" icon={<CheckCircleOutlined />} onClick={async () => { await form.validateFields(); message.success('评测已开始，即将打开浦江实验室评测平台'); window.open(PUJIANG_PLATFORM_URL, '_blank', 'noopener,noreferrer'); }}>开始评测</Button>
      </Space>
    </Card>
  </div>;
};

export default PujiangTaskForm;
