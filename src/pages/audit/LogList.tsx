import { useState } from 'react';
import { ProColumns, ProTable } from '@ant-design/pro-components';
import { Button, Space, Tag, Typography, Modal, Drawer, Descriptions, DatePicker, Select, message } from 'antd';
import {
  EyeOutlined,
  ExportOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import {
  mockAuditLogs,
  type AuditLog,
  type OperationType,
  type OperationModule,
  type OperationResult,
} from '../../mock/audit';
import { getAuditLogs } from '../../services/auditApi';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const operationTypeOptions: { label: string; value: OperationType }[] = [
  { label: '登录', value: '登录' },
  { label: '查看', value: '查看' },
  { label: '创建', value: '创建' },
  { label: '编辑', value: '编辑' },
  { label: '删除', value: '删除' },
  { label: '审批', value: '审批' },
  { label: '导出', value: '导出' },
];

const operationModuleOptions: { label: string; value: OperationModule }[] = [
  { label: '智能体中心', value: '智能体中心' },
  { label: '台账管理', value: '台账管理' },
  { label: '评测中心', value: '评测中心' },
  { label: '编排中心', value: '编排中心' },
  { label: '监控中心', value: '监控中心' },
  { label: '安全中心', value: '安全中心' },
  { label: '数据资产', value: '数据资产' },
  { label: '用户中心', value: '用户中心' },
  { label: '系统设置', value: '系统设置' },
];

const resultOptions: { label: string; value: OperationResult }[] = [
  { label: '成功', value: '成功' },
  { label: '失败', value: '失败' },
];

const operationTypeColorMap: Record<OperationType, string> = {
  '登录': 'blue',
  '查看': 'default',
  '创建': 'green',
  '编辑': 'orange',
  '删除': 'red',
  '审批': 'purple',
  '导出': 'cyan',
};

const resultColorMap: Record<OperationResult, string> = {
  '成功': 'success',
  '失败': 'error',
};

const LogList = () => {
  const { currentUser } = useAuth();
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filterParams, setFilterParams] = useState<{
    startTime?: string;
    endTime?: string;
    operator?: string;
    operationType?: OperationType;
    module?: OperationModule;
    result?: OperationResult;
  }>({});

  const isItAdmin = currentUser?.roles.includes('信息科管理员') ?? false;

  const handleViewDetail = (record: AuditLog) => {
    setSelectedLog(record);
    setDetailVisible(true);
  };

  const handleExport = () => {
    if (!isItAdmin) {
      message.warning('仅信息科管理员可导出日志');
      return;
    }
    message.success('审计日志导出请求已提交，请稍候下载');
  };

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setFilterParams((prev) => ({
        ...prev,
        startTime: dates[0]!.startOf('day').toISOString(),
        endTime: dates[1]!.endOf('day').toISOString(),
      }));
    } else {
      setFilterParams((prev) => ({
        ...prev,
        startTime: undefined,
        endTime: undefined,
      }));
    }
  };

  const columns: ProColumns<AuditLog>[] = [
    {
      title: '日志ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (text) => <Text code>{text}</Text>,
      hideInSearch: true,
    },
    {
      title: '操作时间',
      dataIndex: 'operationTime',
      key: 'operationTime',
      width: 180,
      render: (text) => <Text>{text}</Text>,
      hideInSearch: true,
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      key: 'operator',
      width: 120,
      render: (text) => <Text strong>{text}</Text>,
      valueType: 'select',
      fieldProps: {
        showSearch: true,
        placeholder: '搜索操作人',
      },
      valueEnum: [...new Set(mockAuditLogs.map(log => log.operator))].reduce((acc, op) => {
        acc[op] = { text: op };
        return acc;
      }, {} as Record<string, { text: string }>),
    },
    {
      title: '角色',
      dataIndex: 'operatorRole',
      key: 'operatorRole',
      width: 100,
      render: (text) => <Tag>{text}</Tag>,
      hideInSearch: true,
    },
    {
      title: '操作类型',
      dataIndex: 'operationType',
      key: 'operationType',
      width: 100,
      render: (text: OperationType) => (
        <Tag color={operationTypeColorMap[text]}>{text}</Tag>
      ),
      valueType: 'select',
      valueEnum: operationTypeOptions.reduce((acc, opt) => {
        acc[opt.value] = { text: opt.label };
        return acc;
      }, {} as Record<string, { text: string }>),
    },
    {
      title: '操作模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (text) => <Tag>{text}</Tag>,
      valueType: 'select',
      valueEnum: operationModuleOptions.reduce((acc, opt) => {
        acc[opt.value] = { text: opt.label };
        return acc;
      }, {} as Record<string, { text: string }>),
    },
    {
      title: '操作对象',
      dataIndex: 'operationObject',
      key: 'operationObject',
      width: 180,
      ellipsis: true,
      render: (text) => <Text type="secondary">{text}</Text>,
    },
    {
      title: '操作摘要',
      dataIndex: 'summary',
      key: 'summary',
      width: 200,
      ellipsis: true,
      render: (_, record) => (
        <Text type="secondary">
          {record.operationType}了{record.operationObject}
        </Text>
      ),
      hideInSearch: true,
    },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      width: 80,
      render: (text: OperationResult) => (
        <Space>
          {text === '成功' ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          )}
          <Text type={text === '成功' ? undefined : 'danger'}>{text}</Text>
        </Space>
      ),
      valueType: 'select',
      valueEnum: resultOptions.reduce((acc, opt) => {
        acc[opt.value] = { text: opt.label };
        return acc;
      }, {} as Record<string, { text: string }>),
    },
    {
      title: 'IP地址',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
      render: (text) => <Text type="secondary" style={{ fontSize: 12 }}>{text}</Text>,
      hideInSearch: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          详情
        </Button>
      ),
    },
  ];

  const requestHandler = async (params: any) => {
    let filtered = [...mockAuditLogs];

    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.operator.toLowerCase().includes(keyword) ||
          log.operationObject.toLowerCase().includes(keyword) ||
          log.id.toLowerCase().includes(keyword)
      );
    }

    if (params.operationType) {
      filtered = filtered.filter((log) => log.operationType === params.operationType);
    }

    if (params.module) {
      filtered = filtered.filter((log) => log.module === params.module);
    }

    if (params.result) {
      filtered = filtered.filter((log) => log.result === params.result);
    }

    const { current = 1, pageSize = 10 } = params;
    const start = (current - 1) * pageSize;
    const end = start + pageSize;

    return {
      data: filtered.slice(start, end),
      success: true,
      total: filtered.length,
    };
  };

  // 非信息科管理员只读模式：只展示审计日志列表，禁用所有写操作（导出、批量操作等）
  const readOnly = !isItAdmin;

  return (
    <div style={{ padding: 24, background: '#F5F5F5' }}>
      <PageHeader
        title="审计日志"
        subTitle="查看系统操作审计记录"
        extra={[
          <Button
            key="export"
            type="primary"
            icon={<ExportOutlined />}
            onClick={handleExport}
            disabled={readOnly}
          >
            导出Excel
          </Button>,
        ]}
      />

      <ProTable<AuditLog>
        columns={columns}
        request={requestHandler}
        rowKey="id"
        search={{
          labelWidth: 'auto',
        }}
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        toolBarRender={() => [
          <RangePicker
            key="dateRange"
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            onChange={handleDateRangeChange}
            placeholder={['开始时间', '结束时间']}
            style={{ width: 280 }}
          />,
        ]}
      />

      {/* Detail Drawer */}
      <Drawer
        title="审计日志详情"
        placement="right"
        width={600}
        open={detailVisible}
        onClose={() => setDetailVisible(false)}
      >
        {selectedLog && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="日志ID" span={2}>
              <Text code>{selectedLog.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="操作时间">
              {selectedLog.operationTime}
            </Descriptions.Item>
            <Descriptions.Item label="IP地址">
              {selectedLog.ipAddress}
            </Descriptions.Item>
            <Descriptions.Item label="操作人">
              {selectedLog.operator}
            </Descriptions.Item>
            <Descriptions.Item label="操作人角色">
              <Tag>{selectedLog.operatorRole}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="操作人科室">
              {selectedLog.operatorDept}
            </Descriptions.Item>
            <Descriptions.Item label="操作类型">
              <Tag color={operationTypeColorMap[selectedLog.operationType]}>
                {selectedLog.operationType}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="操作结果">
              <Space>
                {selectedLog.result === '成功' ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <Text type={selectedLog.result === '成功' ? undefined : 'danger'}>
                  {selectedLog.result}
                </Text>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="操作模块" span={2}>
              <Tag>{selectedLog.module}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="操作对象" span={2}>
              {selectedLog.operationObject}
              {selectedLog.objectId && (
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  (ID: {selectedLog.objectId})
                </Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="操作详情" span={2}>
              {selectedLog.detail || '-'}
            </Descriptions.Item>
          </Descriptions>
        )}

        {selectedLog && (selectedLog.beforeData || selectedLog.afterData) && (
          <>
            <Text strong style={{ display: 'block', marginTop: 24, marginBottom: 12 }}>
              数据变更
            </Text>
            <Descriptions column={2} bordered size="small" title="变更前">
              {selectedLog.beforeData ? (
                Object.entries(selectedLog.beforeData).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {String(value)}
                  </Descriptions.Item>
                ))
              ) : (
                <Descriptions.Item span={2}>-</Descriptions.Item>
              )}
            </Descriptions>
            <Descriptions column={2} bordered size="small" title="变更后" style={{ marginTop: 8 }}>
              {selectedLog.afterData ? (
                Object.entries(selectedLog.afterData).map(([key, value]) => (
                  <Descriptions.Item key={key} label={key}>
                    {String(value)}
                  </Descriptions.Item>
                ))
              ) : (
                <Descriptions.Item span={2}>-</Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
      </Drawer>
    </div>
  );
};

export default LogList;
