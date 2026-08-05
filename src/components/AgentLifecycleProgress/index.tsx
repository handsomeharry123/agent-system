import { Card, Steps, Typography } from 'antd';

const { Text } = Typography;

export const AGENT_LIFECYCLE_STAGES = [
  '立项',
  '接入',
  '安全性评测',
  '浦江实验室评测',
  '上线',
] as const;

export type AgentLifecycleStage = (typeof AGENT_LIFECYCLE_STAGES)[number];

interface AgentLifecycleProgressProps {
  currentStage?: AgentLifecycleStage;
}

/** 从立项到上线的统一流程进度，供各业务详情页复用。 */
const AgentLifecycleProgress = ({ currentStage = '立项' }: AgentLifecycleProgressProps) => {
  const current = Math.max(0, AGENT_LIFECYCLE_STAGES.indexOf(currentStage));

  return (
    <Card
      bordered={false}
      styles={{ body: { padding: '18px 32px 16px' } }}
      data-testid="agent-lifecycle-progress"
      aria-label={`项目流程进度，当前节点：${currentStage}`}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
        <Text strong style={{ fontSize: 16 }}>项目进度</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>当前节点及之前的流程节点已点亮</Text>
      </div>
      <Steps
        current={current}
        responsive={false}
        size="small"
        items={AGENT_LIFECYCLE_STAGES.map((title) => ({ title }))}
      />
    </Card>
  );
};

export default AgentLifecycleProgress;
