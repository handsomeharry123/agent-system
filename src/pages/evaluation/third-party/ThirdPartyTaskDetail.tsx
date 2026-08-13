import { useEffect } from 'react';
import { Button, Card, Descriptions, Space, Table, Tag, message } from 'antd';
import { DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../../components/PageHeader';
import { useSmartDraft } from '../../agent-center/smart/store';
import { specFor } from './platforms';

export default function ThirdPartyTaskDetail() {
  const { platformKey } = useParams();
  const platform = specFor(platformKey);
  const navigate = useNavigate();
  const { pushWelcomeGreeting, consumeWelcome } = useSmartDraft();
  const agentName = '超声检查预约助手';
  useEffect(() => {
    const eventName = `${platform.key}-report-download`;
    const download = () => message.success('评测结果报告开始下载');
    window.addEventListener(eventName, download);
    pushWelcomeGreeting(platform.key === 'medagentbench' ? 'medagentbench-evaluation-report' : 'cp-env-evaluation-report', 'admin', () => [agentName], { windowReplacements: [agentName], actions: [{ key: `${platform.key}-download`, label: '评测结果报告下载', event: eventName, enabled: true }] });
    return () => { window.removeEventListener(eventName, download); consumeWelcome(); };
  }, [consumeWelcome, platform.key, pushWelcomeGreeting]);
  const scores = platform.dimensions.map((dimension, index) => ({ dimension, score: 92 - index * 3, time: '2026-08-12 15:40:00' }));
  return <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100%' }}><PageHeader title={`${platform.name}结果详情`} subTitle="查看最新及历次评测结果" showBack onBack={() => navigate(-1)} extra={<Space><Button icon={<EyeOutlined />} onClick={() => message.info('正在打开评测结果报告预览')}>报告查看</Button><Button type="primary" icon={<DownloadOutlined />} onClick={() => message.success('评测结果报告开始下载')}>报告下载</Button></Space>} /><Card title="智能体基本信息" style={{ marginTop: 16 }}><Descriptions column={3} bordered><Descriptions.Item label="智能体编号">AG-0001</Descriptions.Item><Descriptions.Item label="智能体名称">{agentName}</Descriptions.Item><Descriptions.Item label="智能体版本">{platform.versions[0]}</Descriptions.Item></Descriptions></Card><Card title="最新评测结果总览" style={{ marginTop: 16 }}><Descriptions column={1} bordered><Descriptions.Item label="核心结论"><Tag color="success">评测通过</Tag></Descriptions.Item><Descriptions.Item label="具体说明">各项评测维度均达到平台准入要求，智能体表现稳定。</Descriptions.Item></Descriptions></Card><Card title="最新评测结果详情" style={{ marginTop: 16 }}><Table rowKey="dimension" pagination={false} dataSource={scores} columns={[{ title: '评测维度', dataIndex: 'dimension' }, { title: '得分', dataIndex: 'score' }, { title: '评测完成时间', dataIndex: 'time' }]} /></Card></div>;
}
