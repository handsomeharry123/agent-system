import { CheckOutlined } from '@ant-design/icons';
import { Card, Typography } from 'antd';
import type { CSSProperties } from 'react';
import './index.css';

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
  const progress = current / (AGENT_LIFECYCLE_STAGES.length - 1) * 100;

  return (
    <Card
      bordered={false}
      className="lifecycle-card"
      data-testid="agent-lifecycle-progress"
      aria-label={`项目流程进度，当前节点：${currentStage}`}
    >
      <div className="lifecycle-heading">
        <Text strong className="lifecycle-title">项目进度</Text>
        <span className="lifecycle-status"><i />当前阶段：{currentStage}</span>
      </div>

      <div className="lifecycle-progress-body" style={{ '--lifecycle-progress': `${progress}%` } as CSSProperties}>
        <div className="lifecycle-track" aria-hidden="true">
          <div className="lifecycle-track-fill"><span /></div>
        </div>
        <ol className="lifecycle-steps">
          {AGENT_LIFECYCLE_STAGES.map((title, index) => {
            const completed = index < current;
            const active = index === current;
            return (
              <li
                key={title}
                className={`lifecycle-step${completed ? ' is-completed' : ''}${active ? ' is-active' : ''}`}
                style={{ '--step-index': index } as CSSProperties}
                aria-current={active ? 'step' : undefined}
              >
                <span className="lifecycle-node" aria-hidden="true">
                  <span className="lifecycle-node-ring" />
                  <span className="lifecycle-node-core">
                    {completed ? <CheckOutlined /> : index + 1}
                  </span>
                </span>
                <span className="lifecycle-label">{title}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
};

export default AgentLifecycleProgress;
