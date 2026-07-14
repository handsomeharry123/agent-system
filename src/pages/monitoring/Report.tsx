import { useRef, useState } from 'react';
import { Button, Card, Col, Row, Space, Table, Tag, Typography, message } from 'antd';
import { DownloadOutlined, EyeOutlined, FileTextOutlined, LeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PageHeader from '../../components/PageHeader';
import { useDemoSettings } from '../../hooks/useDemoSettings';
import {
  alertOverviewKpiV18,
  businessKpiV18,
  costKpiV18,
  mockAlertEventsV18,
  statusKpiV18,
} from '../../mock/monitoringV18';

const { Text, Title, Paragraph } = Typography;

const MonitoringReport = () => {
  const navigate = useNavigate();
  const { demoRole } = useDemoSettings();
  const reportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const isItAdmin = demoRole === '信息科管理员';
  const scope = isItAdmin ? '全院' : '本科室';
  const templateName = isItAdmin
    ? '全院智能体运行监控情况报告模板.docx'
    : '科室智能体运行监控情况报告模板.docx';
  const title = `${scope}智能体运行监控情况报告`;
  const onlineRate = ((statusKpiV18.online / statusKpiV18.total) * 100).toFixed(1);
  const topAlerts = mockAlertEventsV18.slice(0, 4).map((item, index) => ({
    key: item.id,
    agent: item.agentName,
    level: index < 2 ? '高' : index === 2 ? '中' : '低',
    metric: item.triggerContent.trigger_condition.metric,
    status: item.status,
  }));

  const downloadPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.8,
        backgroundColor: '#FFFFFF',
        useCORS: true,
        logging: false,
      });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const image = canvas.toDataURL('image/jpeg', 0.92);
      let heightLeft = imgHeight;
      let position = margin;
      pdf.addImage(image, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(image, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }
      pdf.save(`${title}_${new Date().toISOString().slice(0, 10)}.pdf`);
      message.success('已下载 PDF 格式报告');
    } catch {
      message.error('PDF 报告下载失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ padding: 24, background: '#F5F7FA', minHeight: '100%' }}>
      <PageHeader
        title={title}
        subTitle={`依据当前角色自动套用：${templateName}`}
        extra={(
          <Space>
            <Button icon={<LeftOutlined />} onClick={() => navigate('/app/home/overview')}>
              返回对话
            </Button>
            <Button icon={<EyeOutlined />} onClick={() => window.print()}>
              查看报告详情
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={downloadPdf}>
              下载 PDF
            </Button>
          </Space>
        )}
      />

      <div ref={reportRef} style={{ maxWidth: 980, margin: '0 auto', background: '#FFFFFF', padding: 36 }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1677FF', paddingBottom: 24, marginBottom: 24 }}>
          <FileTextOutlined style={{ color: '#1677FF', fontSize: 34 }} />
          <Title level={2} style={{ marginTop: 12 }}>{title}</Title>
          <Text type="secondary">统计周期：今日 00:00 至当前 · 生成角色：{demoRole} · 参考模板：{templateName}</Text>
        </div>

        <Row gutter={[12, 12]}>
          {[
            ['今日调用量', `${businessKpiV18.todayCalls.toLocaleString()} 次`, '#1677FF'],
            ['任务执行成功率', `${businessKpiV18.todaySuccessRate}%`, '#13C2C2'],
            ['在线率', `${onlineRate}%`, '#52C41A'],
            ['今日 Token', `${costKpiV18.token.today.toLocaleString()}`, '#FA8C16'],
          ].map(([label, value, color]) => (
            <Col span={6} key={label}>
              <Card size="small" style={{ borderRadius: 8 }}>
                <Text type="secondary">{label}</Text>
                <div style={{ color, fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value}</div>
              </Card>
            </Col>
          ))}
        </Row>

        <Title level={4}>一、整体运行结论</Title>
        <Paragraph>
          {scope}智能体今日整体运行平稳，业务维度调用量保持高位，任务执行成功率维持在 {businessKpiV18.todaySuccessRate}%；
          状态维度在线 {statusKpiV18.online} 个、异常 {statusKpiV18.abnormal} 个；成本维度 Token 消耗处于可控区间；
          安全维度对提示词注入、越权访问和敏感信息外发保持拦截。
        </Paragraph>

        <Title level={4}>二、四维监控摘要</Title>
        <Table
          size="small"
          pagination={false}
          columns={[
            { title: '维度', dataIndex: 'dimension' },
            { title: '核心指标', dataIndex: 'metric' },
            { title: '运行判断', dataIndex: 'summary' },
          ]}
          dataSource={[
            { key: 'biz', dimension: '业务监控', metric: '调用量、成功率、P95 响应时间、任务中断率', summary: '调用活跃，需关注影像类高峰响应时间' },
            { key: 'status', dimension: '状态监控', metric: '在线率、心跳成功率、异常实例', summary: '在线率稳定，少量实例需排查心跳波动' },
            { key: 'cost', dimension: '成本监控', metric: 'Token、CPU/GPU/内存、单任务成本', summary: '总体可控，高成本模型调用需持续观察' },
            { key: 'safe', dimension: '安全监控', metric: '注入攻击、越权访问、敏感信息外发', summary: '已触发拦截，暂无扩散风险' },
          ]}
        />

        <Title level={4}>三、告警与处置建议</Title>
        <Space size={8} wrap style={{ marginBottom: 12 }}>
          <Tag color="red">未处理 {alertOverviewKpiV18.unhandled}</Tag>
          <Tag color="orange">今日告警 {alertOverviewKpiV18.totalToday}</Tag>
          <Tag color="green">已处理 {alertOverviewKpiV18.handled}</Tag>
        </Space>
        <Table
          size="small"
          pagination={false}
          columns={[
            { title: '智能体', dataIndex: 'agent' },
            { title: '级别', dataIndex: 'level', render: (v) => <Tag color={v === '高' ? 'red' : 'orange'}>{v}</Tag> },
            { title: '触发指标', dataIndex: 'metric' },
            { title: '当前状态', dataIndex: 'status' },
          ]}
          dataSource={topAlerts}
        />

        <Title level={4}>四、后续动作</Title>
        <Paragraph>
          建议优先处理高/中级告警，复核任务执行成功率与 P95 响应时间的趋势变化；
          对高成本模型调用设置日预算阈值，并保留本报告 PDF 作为今日监控归档。
        </Paragraph>
      </div>
    </div>
  );
};

export default MonitoringReport;
