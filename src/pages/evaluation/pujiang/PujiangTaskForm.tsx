import { useMemo } from 'react';
import { ArrowLeftOutlined, ExportOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Descriptions, Form, Select, Space, Typography, message } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import { PUJIANG_DIMENSIONS, PUJIANG_PLATFORM, PUJIANG_PLATFORM_URL, getPujiangTask, initialPujiangTasks } from './data';

const { Link, Text } = Typography;

const PujiangTaskForm = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editingTask = useMemo(() => params.get('taskId') ? getPujiangTask(params.get('taskId')!) : undefined, [params]);
  const [form] = Form.useForm();
  const selectedId = Form.useWatch('agentId', form);
  const selectedAgent = initialPujiangTasks.find((task) => task.id === selectedId) || editingTask || initialPujiangTasks[0];
  const back = (notice?: string) => { if (notice) message.success(notice); navigate('/app/evaluation/tasks?module=pujiang'); };

  return <div style={{ padding: 24, background: '#F5F5F5', minHeight: '100%' }}>
    <PageHeader title={editingTask ? '编辑浦江评测任务' : '新建浦江评测任务'} subTitle="填写并确认智能体信息，前往浦江实验室完成评测" showBack onBack={() => back('已自动保存为草稿')} />
    <Card title="智能体基本信息" style={{ marginTop: 16 }}>
      <Form form={form} layout="vertical" initialValues={{ agentId: editingTask?.id || initialPujiangTasks[0].id, dimensions: [...PUJIANG_DIMENSIONS] }}>
        <Form.Item label="选择智能体" name="agentId" rules={[{ required: true, message: '请选择智能体' }]}>
          <Select style={{ maxWidth: 520 }} showSearch optionFilterProp="label" options={initialPujiangTasks.map((task) => ({ value: task.id, label: `${task.agentName}（${task.agentCode}）` }))} />
        </Form.Item>
        <Descriptions bordered column={3} size="middle" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="智能体编号">{selectedAgent.agentCode}</Descriptions.Item>
          <Descriptions.Item label="智能体名称">{selectedAgent.agentName}</Descriptions.Item>
          <Descriptions.Item label="智能体版本">{selectedAgent.version}</Descriptions.Item>
        </Descriptions>
        <Form.Item label="评测平台">
          <Space direction="vertical" size={4}>
            <Text strong>{PUJIANG_PLATFORM}</Text>
            <Link href={PUJIANG_PLATFORM_URL} target="_blank" rel="noreferrer"><ExportOutlined /> {PUJIANG_PLATFORM_URL}</Link>
          </Space>
        </Form.Item>
        <Form.Item label="评测维度" name="dimensions">
          <Checkbox.Group options={PUJIANG_DIMENSIONS.map((value) => ({ label: value, value }))} style={{ display: 'grid', gap: 12 }} />
        </Form.Item>
      </Form>
    </Card>
    <Card style={{ marginTop: 16 }} bodyStyle={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => back('已保存为草稿')}>返回并保存草稿</Button>
        <Button onClick={() => back('草稿已保存')}>保存草稿</Button>
        <Button type="primary" icon={<ExportOutlined />} onClick={async () => { await form.validateFields(); message.success('信息已确认，即将打开浦江实验室评测平台'); window.open(PUJIANG_PLATFORM_URL, '_blank', 'noopener,noreferrer'); }}>前往评测平台</Button>
      </Space>
    </Card>
  </div>;
};

export default PujiangTaskForm;
