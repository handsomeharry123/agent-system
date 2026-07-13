export type AutoTaskTemplate = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  frequency: {
    type: 'cycle' | 'interval' | 'once';
    cyclePeriod?: 'day' | 'week' | 'month';
    cycleTime?: string;
    intervalValue?: number;
    intervalUnit?: 'hour' | 'minute';
  };
};

export const autoTaskTemplates: AutoTaskTemplate[] = [
  {
    id: 'daily-ai-news',
    name: '每日 AI 新闻推送',
    description: '关注当天 AI 领域的重要动态，侧重 AI coding 与具身智能方向。',
    prompt:
      '关注当天 AI 领域的重要动态，侧重 AI coding 与具身智能方向。筛选 3-5 条有价值的信息，简要说明事件内容及值得关注的原因。',
    frequency: { type: 'cycle', cyclePeriod: 'day', cycleTime: '09:00' },
  },
  {
    id: 'daily-english-words',
    name: '每日 5 个英语单词',
    description: '每天推荐 5 个高频实用英语单词，包含释义、例句与记忆提示。',
    prompt: '每天推荐 5 个高频实用英语单词，包含中文释义、英文例句、使用场景和简短记忆提示。',
    frequency: { type: 'cycle', cyclePeriod: 'day', cycleTime: '08:30' },
  },
  {
    id: 'bedtime-story',
    name: '每日儿童睡前故事',
    description: '生成 3-5 分钟可读的温和睡前故事，情节积极、语言轻柔。',
    prompt: '生成一篇 3-5 分钟可读的儿童睡前故事，语气温和，情节积极，结尾带一句晚安祝福。',
    frequency: { type: 'cycle', cyclePeriod: 'day', cycleTime: '20:30' },
  },
  {
    id: 'weekly-work-report',
    name: '每周工作周报',
    description: '每周五汇总仓库 PR 与 Issue 进展，输出重点、风险和下周计划。',
    prompt: '每周汇总本周工作进展，包含完成事项、进行中事项、风险阻塞、下周计划，并用简洁条目输出。',
    frequency: { type: 'cycle', cyclePeriod: 'week', cycleTime: '17:30' },
  },
  {
    id: 'classic-movie',
    name: '经典电影推荐',
    description: '推荐一部高分经典电影，简要介绍剧情、亮点与适合人群。',
    prompt: '推荐一部高分经典电影，简要介绍剧情、推荐理由、适合人群，并附 3 个观影看点。',
    frequency: { type: 'cycle', cyclePeriod: 'week', cycleTime: '19:00' },
  },
  {
    id: 'today-history',
    name: '历史上的今天',
    description: '从科技、电影、音乐等领域挑选一件今天发生过的事件。',
    prompt: '从科技、电影、音乐等领域挑选一件历史上的今天发生过的事件，说明背景、影响和一个有趣细节。',
    frequency: { type: 'cycle', cyclePeriod: 'day', cycleTime: '09:00' },
  },
  {
    id: 'daily-question',
    name: '每日一个为什么',
    description: '每天抛出一个有趣问题，先提问再解答，适合轻知识阅读。',
    prompt: '每天提出一个有趣的“为什么”问题，先给出问题，再用通俗语言解释答案，并补充一个延伸知识点。',
    frequency: { type: 'cycle', cyclePeriod: 'day', cycleTime: '12:00' },
  },
  {
    id: 'family-contact',
    name: '父母联系提醒',
    description: '每周日提醒给家人打电话或发送问候消息。',
    prompt: '提醒我联系父母，并生成一段自然、温暖的问候消息，可直接复制发送。',
    frequency: { type: 'cycle', cyclePeriod: 'week', cycleTime: '10:00' },
  },
  {
    id: 'health-check',
    name: '体检预约提醒',
    description: '在指定时间提醒确认体检预约、携带材料和注意事项。',
    prompt: '提醒我确认体检预约，并列出体检前需要注意的事项、需携带材料和当天时间安排。',
    frequency: { type: 'cycle', cyclePeriod: 'day', cycleTime: '07:00' },
  },
  {
    id: 'interview-prep',
    name: '面试准备提醒',
    description: '工作日每 2 小时提醒复习面试题、项目经历和表达结构。',
    prompt: '提醒我进行面试准备，随机给出一个复习主题：项目经历、系统设计、算法题、行为面试或自我介绍。',
    frequency: { type: 'interval', intervalValue: 2, intervalUnit: 'hour' },
  },
  {
    id: 'meeting-prep',
    name: '会议前准备',
    description: '在会议开始前提醒整理议题、目标、材料和待确认事项。',
    prompt: '提醒我准备会议，列出会议目标、议题、需提前阅读的材料、待确认事项和会后行动项模板。',
    frequency: { type: 'cycle', cyclePeriod: 'day', cycleTime: '08:45' },
  },
  {
    id: 'pet-wallpaper',
    name: '可爱萌宠手机壁纸',
    description: '随机从 7 种不同风格中挑选一种，为你生成壁纸提示词。',
    prompt: '随机选择一种可爱萌宠壁纸风格，生成适合手机壁纸的详细图片提示词，包含主体、背景、色彩和构图。',
    frequency: { type: 'cycle', cyclePeriod: 'day', cycleTime: '18:00' },
  },
];

export function getAutoTaskTemplate(id?: string | null) {
  if (!id) return undefined;
  return autoTaskTemplates.find((template) => template.id === id);
}
