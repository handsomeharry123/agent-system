/**
 * Agent 机器人形象 — SVG 实现
 *
 * 3.1.1 入口形象规范 (按上传图片优化):
 *   - 萌系医疗管家形象:白头盔 + 蓝色十字医疗标识 + 心形光环天线
 *   - 深蓝面罩 + 表情眼(常态/眨眼/笑容) + 粉色腮红
 *   - 白色医生袍 + 蓝色衬衫领带 + 心形胸徽 + 蓝色披风
 *   - 通过 CSS keyframes + transform 实现「呼吸 / 招手 / 天线摆动」微动画
 *   - hover prefers-reduced-motion: reduce 时降级为静态图标
 *
 * 不依赖第三方 Lottie 库 —— 用纯 SVG + CSS animation 即可避免引入
 * 额外依赖并满足降级条件。
 */
import { useEffect, useState } from 'react';
import type { AgentMood } from './types';

interface Props {
  mood?: AgentMood;
  size?: number;
  /** 浮动红点是否可见 (右上角未读提示) */
  badge?: number | boolean;
}

const RobotIcon = ({ mood = 'idle', size = 64, badge }: Props) => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const eyeVariant = mood === 'thinking' ? 'loading' : mood === 'happy' ? 'smile' : 'normal';

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        pointerEvents: 'none',
      }}
    >
      <svg
        viewBox="0 0 96 96"
        width={size}
        height={size}
        style={{
          display: 'block',
          filter: 'drop-shadow(0 4px 10px rgba(22, 119, 255, 0.28))',
        }}
        className={reduced ? '' : 'agent-robot-breathe'}
        aria-hidden
      >
        <defs>
          {/* 头盔高光 (白→淡蓝) */}
          <radialGradient id="agent-helmet-grad" cx="38%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#F0F7FF" />
            <stop offset="100%" stopColor="#C9DEFF" />
          </radialGradient>
          {/* 医生袍渐变 (白→淡蓝灰) */}
          <linearGradient id="agent-coat-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E8F1FB" />
          </linearGradient>
          {/* 披风渐变 (深→中蓝) */}
          <linearGradient id="agent-cape-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4096FF" />
            <stop offset="100%" stopColor="#0958D9" />
          </linearGradient>
          {/* 蓝衬衫 */}
          <linearGradient id="agent-shirt-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#69B1FF" />
            <stop offset="100%" stopColor="#1677FF" />
          </linearGradient>
          {/* 心形光环天线辉光 */}
          <radialGradient id="agent-heart-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A0E7FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1677FF" stopOpacity="0" />
          </radialGradient>
          {/* 面罩渐变 (深海军蓝) */}
          <radialGradient id="agent-visor-grad" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#2E54FF" />
            <stop offset="55%" stopColor="#0F1F66" />
            <stop offset="100%" stopColor="#06133D" />
          </radialGradient>
        </defs>

        {/* 接触阴影（地面光圈） */}
        <ellipse cx="48" cy="92" rx="22" ry="3" fill="#1677FF" opacity="0.18" />

        {/* 披风 (在身体后面) */}
        <g>
          {/* 左侧披风 */}
          <path
            d="M 22 50 Q 12 70 18 92 Q 26 86 30 78 Q 28 64 26 54 Z"
            fill="url(#agent-cape-grad)"
            opacity="0.95"
          />
          {/* 右侧披风 (略长,有飘动感) */}
          <path
            d="M 74 50 Q 88 64 84 90 Q 76 84 70 78 Q 72 66 70 54 Z"
            fill="url(#agent-cape-grad)"
            opacity="0.95"
          />
          {/* 披风高光 */}
          <path
            d="M 26 56 Q 22 66 22 78 Q 25 72 27 64 Z"
            fill="#69B1FF"
            opacity="0.45"
          />
        </g>

        {/* 双足 (蓝色小靴) */}
        <g>
          <ellipse cx="36" cy="90" rx="8" ry="3.5" fill="#0958D9" />
          <ellipse cx="60" cy="90" rx="8" ry="3.5" fill="#0958D9" />
          <rect x="29" y="84" width="14" height="7" rx="3" fill="#1677FF" />
          <rect x="53" y="84" width="14" height="7" rx="3" fill="#1677FF" />
          <rect x="29" y="89" width="14" height="2.5" rx="1.2" fill="#003EB3" />
          <rect x="53" y="89" width="14" height="2.5" rx="1.2" fill="#003EB3" />
        </g>

        {/* 双腿 (蓝色裤) */}
        <g>
          <rect x="32" y="76" width="11" height="10" rx="3" fill="#1677FF" />
          <rect x="53" y="76" width="11" height="10" rx="3" fill="#1677FF" />
        </g>

        {/* 医生袍主体 (白色外袍) */}
        <g>
          {/* 袍身后摆 */}
          <path
            d="M 18 50
               Q 16 56 16 70
               Q 16 80 22 86
               L 74 86
               Q 80 80 80 70
               Q 80 56 78 50
               Z"
            fill="url(#agent-coat-grad)"
            stroke="#BFD8FF"
            strokeWidth="0.8"
          />
          {/* 衣领 V 形 */}
          <path
            d="M 38 50 L 48 64 L 58 50 Z"
            fill="#1677FF"
          />
          {/* 蓝色衬衫领口 */}
          <path
            d="M 36 50 Q 48 56 60 50 L 58 50 L 48 64 L 38 50 Z"
            fill="url(#agent-shirt-grad)"
          />
          {/* 领带 */}
          <path
            d="M 48 56 L 45 60 L 48 70 L 51 60 Z"
            fill="#003EB3"
          />
          {/* 领带结 */}
          <path
            d="M 46 56 L 50 56 L 49 60 L 47 60 Z"
            fill="#0958D9"
          />
          {/* 衣领翻折线 (白) */}
          <path
            d="M 36 50 L 44 56 L 40 54 Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
          <path
            d="M 60 50 L 52 56 L 56 54 Z"
            fill="#FFFFFF"
            opacity="0.9"
          />
          {/* 胸前心形徽章 (口袋位置) */}
          <g>
            <rect x="58" y="68" width="14" height="11" rx="2" fill="#FFFFFF" stroke="#BFD8FF" strokeWidth="0.6" />
            {/* 心形 */}
            <path
              d="M 65 70.5
                 C 64 69 62 69.2 62 71
                 C 62 72.6 65 75 65 75
                 C 65 75 68 72.6 68 71
                 C 68 69.2 66 69 65 70.5 Z"
              fill="#1677FF"
            />
          </g>
          {/* 袍身中线纽扣 (装饰) */}
          <circle cx="48" cy="74" r="1.4" fill="#1677FF" opacity="0.5" />
          <circle cx="48" cy="80" r="1.4" fill="#1677FF" opacity="0.5" />
        </g>

        {/* 双臂 (招手动画) — 在医生袍前后层叠 */}
        <g
          className={reduced ? '' : mood === 'hover' ? 'agent-robot-wave' : ''}
          style={{ transformOrigin: '22px 56px' }}
        >
          {/* 左臂 (自然下垂) */}
          <path
            d="M 18 50 Q 14 60 16 72 Q 20 74 22 70 Q 24 60 24 52 Z"
            fill="url(#agent-coat-grad)"
            stroke="#BFD8FF"
            strokeWidth="0.6"
          />
          {/* 左手 (白色圆手套) */}
          <circle cx="17" cy="72" r="4" fill="#FFFFFF" stroke="#BFD8FF" strokeWidth="0.6" />
        </g>

        <g
          className={reduced ? '' : mood === 'hover' ? 'agent-robot-wave' : ''}
          style={{ transformOrigin: '74px 56px' }}
        >
          {/* 右臂 (竖起大拇指) */}
          <path
            d="M 72 50 Q 78 58 78 68 Q 76 72 72 72 Q 68 70 68 60 Q 70 52 72 50 Z"
            fill="url(#agent-coat-grad)"
            stroke="#BFD8FF"
            strokeWidth="0.6"
          />
          {/* 右手白色圆手套 */}
          <circle cx="75" cy="70" r="4.5" fill="#FFFFFF" stroke="#BFD8FF" strokeWidth="0.6" />
          {/* 竖起的拇指 */}
          <rect x="73" y="60" width="4" height="7" rx="2" fill="#FFFFFF" stroke="#BFD8FF" strokeWidth="0.6" />
        </g>

        {/* 头盔主体 (圆头大白盔) */}
        <g>
          {/* 头盔底层阴影 */}
          <ellipse cx="48" cy="40" rx="26" ry="22" fill="#BFD8FF" opacity="0.4" />
          {/* 头盔主体 */}
          <circle cx="48" cy="38" r="24" fill="url(#agent-helmet-grad)" stroke="#1677FF" strokeWidth="1.2" />

          {/* 头顶高光 */}
          <ellipse cx="38" cy="26" rx="9" ry="5" fill="#FFFFFF" opacity="0.85" />

          {/* 额头蓝色十字医疗标识 */}
          <g>
            {/* 十字底 (蓝色背景小圆) */}
            <circle cx="48" cy="22" r="6" fill="#1677FF" />
            {/* 白色十字 */}
            <rect x="46.5" y="18" width="3" height="8" rx="0.6" fill="#FFFFFF" />
            <rect x="44" y="20.5" width="8" height="3" rx="0.6" fill="#FFFFFF" />
          </g>

          {/* 深蓝面罩 (visor) — 横跨头部下方 */}
          <g>
            {/* 面罩底色 — 圆角矩形,微微弧形 */}
            <path
              d="M 26 36
                 Q 24 32 28 30
                 Q 36 28 48 28
                 Q 60 28 68 30
                 Q 72 32 70 36
                 Q 72 46 68 50
                 Q 60 52 48 52
                 Q 36 52 28 50
                 Q 24 46 26 36 Z"
              fill="url(#agent-visor-grad)"
              stroke="#06133D"
              strokeWidth="0.8"
            />
            {/* 面罩顶部高光 */}
            <path
              d="M 30 32 Q 40 30 56 30 Q 64 30 66 32 Q 56 31 40 31 Q 32 31 30 32 Z"
              fill="#5B8DFF"
              opacity="0.5"
            />
            {/* 面罩底部反光 */}
            <path
              d="M 30 48 Q 40 50 56 50 Q 64 50 66 48 Q 56 49 40 49 Q 32 49 30 48 Z"
              fill="#FFFFFF"
              opacity="0.12"
            />
          </g>

          {/* 眼睛 / 表情 */}
          {eyeVariant === 'loading' ? (
            // 思考中:左眼睁开圆 + 右眼 loading 横线
            <g>
              <circle cx="38" cy="40" r="3.2" fill="#7FE8FF" className={reduced ? '' : 'agent-robot-eye'} />
              <circle cx="38" cy="40" r="1.2" fill="#FFFFFF" />
              <rect x="53" y="38.5" width="10" height="3" rx="1.5" fill="#7FE8FF" />
              <rect x="55" y="38.5" width="6" height="3" rx="1.5" fill="#FFFFFF" />
            </g>
          ) : eyeVariant === 'smile' ? (
            // 笑容:两个弯弯眼
            <g stroke="#7FE8FF" strokeWidth="2.2" fill="none" strokeLinecap="round">
              <path d="M 33 40 Q 38 35 43 40" />
              <path d="M 53 40 Q 58 35 63 40" />
            </g>
          ) : (
            // 常态:左眼睁开 + 右眼眨眼(俏皮眨眼)
            <g>
              {/* 左眼 (睁开大圆 + 高光) */}
              <circle cx="38" cy="40" r="4" fill="#7FE8FF" />
              <circle cx="38" cy="40" r="2.2" fill="#06133D" />
              <circle cx="39.2" cy="38.8" r="0.9" fill="#FFFFFF" />
              {/* 右眼 (眨眼:一道弧线) */}
              <path
                d="M 53 40 Q 58 36 63 40"
                stroke="#7FE8FF"
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* 嘴巴 (在面罩底部) */}
          {eyeVariant === 'smile' ? (
            <path
              d="M 42 48 Q 48 53 54 48"
              stroke="#FF8FB1"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M 44 48 Q 48 51 52 48"
              stroke="#FF8FB1"
              strokeWidth="1.4"
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* 粉色腮红 */}
          <ellipse cx="30" cy="46" rx="3.2" ry="2" fill="#FF8FB1" opacity="0.55" />
          <ellipse cx="66" cy="46" rx="3.2" ry="2" fill="#FF8FB1" opacity="0.55" />
        </g>

        {/* 心形光环天线 (头顶) */}
        <g
          className={
            reduced
              ? ''
              : mood === 'thinking'
                ? 'agent-robot-antenna-spin'
                : 'agent-robot-antenna'
          }
          style={{ transformOrigin: '48px 6px' }}
        >
          {/* 辉光底 */}
          <circle cx="48" cy="6" r="6" fill="url(#agent-heart-glow)" />
          {/* 心形 — 用两个圆 + 三角组合形成心形 */}
          <g transform="translate(48, 6)">
            <path
              d="M 0 1.5
                 C -1.5 -2.5 -6 -1.5 -6 1.8
                 C -6 4.5 0 8 0 8
                 C 0 8 6 4.5 6 1.8
                 C 6 -1.5 1.5 -2.5 0 1.5 Z"
              fill="#7FE8FF"
              stroke="#1677FF"
              strokeWidth="0.8"
            />
            {/* 心形高光 */}
            <ellipse cx="-2.5" cy="0.5" rx="1.2" ry="0.8" fill="#FFFFFF" opacity="0.9" />
          </g>
          {/* 心形下方小光柱连接头盔 */}
          <line x1="48" y1="13" x2="48" y2="17" stroke="#7FE8FF" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
        </g>
      </svg>

      {badge ? (
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            borderRadius: 8,
            background: '#FF4D4F',
            color: '#fff',
            fontSize: 10,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 2px #fff',
            pointerEvents: 'none',
          }}
        >
          {typeof badge === 'number' ? (badge > 99 ? '99+' : badge) : ''}
        </span>
      ) : null}
    </div>
  );
};

export default RobotIcon;